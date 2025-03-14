import React, { useState } from 'react';
import * as mega from 'megajs';

interface AudioMegaUploaderProps {
  audioBlob: Blob | null;
  email: string;
  password: string;
  folderPath?: string;
}

const AudioMegaUploader: React.FC<AudioMegaUploaderProps> = ({ 
  audioBlob, 
  email, 
  password,
  folderPath = '/AudioUploads' 
}) => {
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [fileName, setFileName] = useState<string>(`enregistrement_${new Date().toISOString().replace(/[:.]/g, '-')}.webm`);
  const [fileUrl, setFileUrl] = useState<string>('');
  const [error, setError] = useState<string>('');

  const uploadToMega = async () => {
    if (!audioBlob) {
      setError("Aucun fichier audio à uploader.");
      return;
    }

    try {
      setIsUploading(true);
      setUploadStatus('idle');
      setError('');
      
      // Connexion à Mega
      const storage = new mega.Storage({
        email,
        password,
        autologin: false
      });
      
      // Attendre que la connexion soit établie
      await new Promise<void>((resolve, reject) => {
        storage.on('ready', () => resolve());
        storage.login((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
      
      // Trouver ou créer le dossier cible
      let targetFolder = storage.root;
      if (folderPath) {
        const pathParts = folderPath.split('/').filter(Boolean);
        for (const part of pathParts) {
          // Vérifier si le dossier existe déjà
          let folder = targetFolder.children?.find(node => node.name === part && node.directory);
          
          if (!folder) {
            // Créer le dossier s'il n'existe pas
            folder = await targetFolder.mkdir(part);
          }
          
          targetFolder = folder;
        }
      }
      
      // Convertir le Blob en File
      const file = new File([audioBlob], fileName, { type: 'audio/webm' });
      
      // Uploader le fichier
      const upload = targetFolder.upload(file, fileName);
      
      // Suivre la progression
    upload.on('progress', (data: { bytesLoaded: number; bytesTotal: number }) => {
      const progress = Math.round((data.bytesLoaded / data.bytesTotal) * 100);
      setUploadProgress(progress);
    });
      
      // Attendre la fin de l'upload
      await new Promise<void>((resolve, reject) => {
        upload.on('complete', () => resolve());
        upload.on('error', (err: Error) => reject(err));
      });
      
      // Obtenir le lien du fichier
      const uploadedFile = targetFolder.children?.find(node => node.name === fileName);
      if (uploadedFile) {
        const link = await uploadedFile.link(true);
        setFileUrl(link);
      }
      
      setUploadStatus('success');
    }
    //eslint-disable-next-line
    catch (err: any) {
      setError(`Erreur lors de l'upload sur Mega: ${err.message}`);
      setUploadStatus('error');
      console.error('Erreur d\'upload:', err);
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <div className="p-6 bg-white rounded-lg shadow-md mt-6">
      <h2 className="text-2xl font-bold mb-4">Upload sur Mega</h2>
      
      <div className="mb-4">
        <label htmlFor="fileName" className="block text-sm font-medium text-gray-700 mb-1">
          Nom du fichier
        </label>
        <input
          type="text"
          id="fileName"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
          disabled={isUploading}
        />
      </div>
      
      <div className="mb-6">
        <button
          onClick={uploadToMega}
          disabled={!audioBlob || isUploading}
          className={`w-full px-6 py-3 rounded-lg font-semibold text-white ${
            !audioBlob || isUploading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700"
          } transition-colors duration-300`}
        >
          {isUploading ? `Upload en cours (${uploadProgress}%)` : "Uploader sur Mega"}
        </button>
      </div>
      
      {isUploading && (
        <div className="mb-4">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-600 transition-all duration-300" 
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}
      
      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-md mb-4">
          {error}
        </div>
      )}
      
      {uploadStatus === 'success' && (
        <div className="p-3 bg-green-100 text-green-700 rounded-md mb-4">
          <p className="font-medium">Upload réussi!</p>
          {fileUrl && (
            <div className="mt-2">
              <p className="text-sm mb-1">Lien de partage:</p>
              <a 
                href={fileUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline break-all"
              >
                {fileUrl}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AudioMegaUploader;