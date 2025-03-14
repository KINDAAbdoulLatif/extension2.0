// import { useState, useRef } from 'react';

// const AudioRecorder = () => {
//   const [isRecording, setIsRecording] = useState(false);
//   const [audioURL, setAudioURL] = useState('');
//   const mediaRecorderRef = useRef<MediaRecorder | null>(null);
//   const audioChunksRef = useRef<Blob[]>([]);

//   const startRecording = async () => {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
//       mediaRecorderRef.current = new MediaRecorder(stream);
//       audioChunksRef.current = [];
      
//       mediaRecorderRef.current.ondataavailable = (e) => {
//         if (e.data.size > 0) {
//           audioChunksRef.current.push(e.data);
//         }
//       };
      
//       mediaRecorderRef.current.onstop = () => {
//         const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
//         const audioUrl = URL.createObjectURL(audioBlob);
//         setAudioURL(audioUrl);
//       };
      
//       mediaRecorderRef.current.start();
//       setIsRecording(true);
//     } catch (error) {
//       console.error("Erreur lors de l'accès au microphone:", error);
//       alert("Impossible d'accéder au microphone. Veuillez vérifier les permissions.");
//     }
//   };

//   const stopRecording = () => {
//     if (mediaRecorderRef.current && isRecording) {
//       mediaRecorderRef.current.stop();
//       setIsRecording(false);
      
//       // Arrêter les tracks du stream
//       mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
//     }
//   };

//   const toggleRecording = () => {
//     if (isRecording) {
//       stopRecording();
//     } else {
//       startRecording();
//     }
//   };

//   return (
//     <div className="flex flex-col items-center p-6 bg-gray-100 rounded-lg shadow-md w-full max-w-md mx-auto">
//       <h2 className="text-2xl font-bold mb-6">Enregistreur Audio</h2>
      
//       <button
//         onClick={toggleRecording}
//         className={`px-6 py-3 rounded-full font-bold text-white ${
//           isRecording 
//             ? "bg-red-600 hover:bg-red-700" 
//             : "bg-blue-600 hover:bg-blue-700"
//         } transition-colors duration-300 flex items-center justify-center`}
//       >
//         {isRecording ? (
//           <>
//             <span className="mr-2">Arrêter l'enregistrement</span>
//             <span className="h-3 w-3 bg-white rounded-full animate-pulse"></span>
//           </>
//         ) : (
//           "Démarrer l'enregistrement"
//         )}
//       </button>
      
//       {audioURL && (
//         <div className="mt-6 w-full">
//           <h3 className="text-lg font-medium mb-2">Enregistrement</h3>
//           <audio src={audioURL} controls className="w-full mt-2" />
//           <div className="mt-2 text-sm text-gray-600">
//             Vous pouvez télécharger l'audio en cliquant avec le bouton droit sur le lecteur.
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default AudioRecorder;

import  { useState, useRef } from 'react';

const AudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState('');
  const [error, setError] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = () => {
    // Réinitialiser les erreurs
    setError('');
    
    // Vérifier si chrome.tabCapture est disponible
    if (!chrome || !chrome.tabCapture) {
      setError("L'API tabCapture n'est pas disponible. Vérifiez que vous êtes dans une extension Chrome.");
      return;
    }

    // Options pour ne capturer que l'audio
    const captureOptions = {
      audio: true,
      video: false
    };

    chrome.tabCapture.capture(captureOptions, (stream) => {
      if (chrome.runtime.lastError) {
        setError(`Erreur: ${chrome.runtime.lastError.message}`);
        return;
      }

      if (!stream) {
        setError("Impossible d'accéder au flux audio.");
        return;
      }

      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioURL(audioUrl);
        
        // Libérer le flux
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
    });
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="flex flex-col items-center p-6 bg-gray-100 rounded-lg shadow-md w-full max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-6">Enregistreur Audio</h2>
      
      <button
        onClick={toggleRecording}
        className={`px-6 py-3 rounded-full font-bold text-white ${
          isRecording 
            ? "bg-red-600 hover:bg-red-700" 
            : "bg-blue-600 hover:bg-blue-700"
        } transition-colors duration-300 flex items-center justify-center`}
      >
        {isRecording ? (
          <>
            <span className="mr-2">Arrêter l'enregistrement</span>
            <span className="h-3 w-3 bg-white rounded-full animate-pulse"></span>
          </>
        ) : (
          "Démarrer l'enregistrement"
        )}
      </button>
      
      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md w-full text-center">
          {error}
        </div>
      )}
      
      {audioURL && (
        <div className="mt-6 w-full">
          <h3 className="text-lg font-medium mb-2">Enregistrement</h3>
          <audio src={audioURL} controls className="w-full mt-2" />
          <div className="mt-2 text-sm text-gray-600">
            Vous pouvez télécharger l'audio en cliquant avec le bouton droit sur le lecteur.
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;