import { DriveFile } from "@/types";

const GOOGLE_DRIVE_FOLDER_NAME = "PromptRelay_Files";

/**
 * Searches for or creates a dedicated "PromptRelay_Files" folder in user's Google Drive
 */
export async function getOrCreatePromptRelayFolder(
  providerToken: string
): Promise<string> {
  const query = encodeURIComponent(
    `name='${GOOGLE_DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );

  // 1. Search for existing folder
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&spaces=drive`,
    {
      headers: {
        Authorization: `Bearer ${providerToken}`,
      },
    }
  );

  if (!searchRes.ok) {
    const errorText = await searchRes.text();
    throw new Error(`Failed to query Google Drive folder: ${errorText}`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // 2. Folder does not exist, create it
  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${providerToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: GOOGLE_DRIVE_FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
      description: "Dedicated storage folder for PromptRelay AI task files",
    }),
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    throw new Error(`Failed to create Google Drive folder: ${errorText}`);
  }

  const createdFolder = await createRes.json();
  return createdFolder.id;
}

/**
 * Uploads a file directly from the browser to user's Google Drive via multipart upload,
 * grants public read permissions (so counterparty can access), and returns file metadata.
 */
export async function uploadFileToUserDrive(
  file: File,
  providerToken?: string | null,
  onProgress?: (pct: number) => void
): Promise<DriveFile> {
  // If no Google provider token is available, create local file preview object
  if (!providerToken || providerToken.trim() === "") {
    return createLocalDrivePreview(file, onProgress);
  }

  try {
    // 1. Ensure folder exists in user's Drive
    const folderId = await getOrCreatePromptRelayFolder(providerToken);

    // 2. Prepare multipart upload body
    const boundary = "-------PromptRelayBoundary" + Math.random().toString(36).substring(2);
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      parents: [folderId],
      description: "PromptRelay Task Asset",
    };

    const fileBuffer = await file.arrayBuffer();

    const metadataPart =
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      JSON.stringify(metadata);

    const fileHeaderPart =
      `Content-Type: ${file.type || "application/octet-stream"}\r\n\r\n`;

    const encoder = new TextEncoder();
    const metadataBytes = encoder.encode(delimiter + metadataPart + delimiter + fileHeaderPart);
    const closeBytes = encoder.encode(closeDelimiter);

    // Combine metadata + binary file + close boundary
    const fullBody = new Uint8Array(
      metadataBytes.byteLength + fileBuffer.byteLength + closeBytes.byteLength
    );
    fullBody.set(metadataBytes, 0);
    fullBody.set(new Uint8Array(fileBuffer), metadataBytes.byteLength);
    fullBody.set(closeBytes, metadataBytes.byteLength + fileBuffer.byteLength);

    // 3. Upload via XMLHttpRequest for tracking progress
    const uploadResult = await new Promise<{ id: string }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(
        "POST",
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,mimeType,webViewLink,webContentLink"
      );
      xhr.setRequestHeader("Authorization", `Bearer ${providerToken}`);
      xhr.setRequestHeader(
        "Content-Type",
        `multipart/related; boundary=${boundary}`
      );

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 90);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            resolve(res);
          } catch (err) {
            reject(new Error("Invalid JSON response from Google Drive"));
          }
        } else {
          reject(new Error(`Google Drive upload failed with HTTP ${xhr.status}: ${xhr.responseText}`));
        }
      };

      xhr.onerror = () => reject(new Error("Network error during Google Drive upload"));
      xhr.send(fullBody);
    });

    const fileId = uploadResult.id;
    if (onProgress) onProgress(95);

    // 4. Grant permission: anyone with link can read
    try {
      await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${providerToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            role: "reader",
            type: "anyone",
          }),
        }
      );
    } catch (permErr) {
      console.warn("Could not set public permission on file:", permErr);
    }

    // 5. Fetch file metadata including direct links
    const metaRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,size,mimeType,webViewLink,webContentLink`,
      {
        headers: {
          Authorization: `Bearer ${providerToken}`,
        },
      }
    );

    const fileData = await metaRes.json();
    if (onProgress) onProgress(100);

    const downloadUrl =
      fileData.webContentLink ||
      `https://drive.google.com/uc?export=download&id=${fileId}`;
    const viewUrl =
      fileData.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

    return {
      name: file.name,
      size: file.size,
      mimeType: file.type || "application/octet-stream",
      driveFileId: fileId,
      downloadUrl,
      viewUrl,
    };
  } catch (err: any) {
    console.error("Google Drive upload error:", err);
    throw new Error(
      `Google Drive upload failed: ${err.message || "Unknown error"}. Please verify your Google Drive permissions or re-authenticate.`
    );
  }
}

/**
 * Creates a local object URL preview for files when Google Drive token is pending
 */
async function createLocalDrivePreview(
  file: File,
  onProgress?: (pct: number) => void
): Promise<DriveFile> {
  const steps = [25, 60, 100];
  for (const step of steps) {
    if (onProgress) onProgress(step);
    await new Promise((r) => setTimeout(r, 60));
  }

  const fileId = "file_" + Math.random().toString(36).substring(2, 10);
  const blobUrl = URL.createObjectURL(file);

  return {
    name: file.name,
    size: file.size,
    mimeType: file.type || "application/octet-stream",
    driveFileId: fileId,
    downloadUrl: blobUrl,
    viewUrl: blobUrl,
  };
}
