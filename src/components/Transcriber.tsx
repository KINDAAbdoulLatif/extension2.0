import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

// interface AudioRecorderTranscriberProps {
//   onTranscriptionComplete: (transcription: string, audioBlob: Blob) => void;
//   apiKey: string;
// }
interface AudioRecorderTranscriberProps {
    onTranscriptionComplete: (text: string, blob: Blob) => void;
    apiKey: string;
    audioBlob: Blob;
  }

const AudioRecorderTranscriber: React.FC<AudioRecorderTranscriberProps> = ({ 
  onTranscriptionComplete, 
  apiKey 
}) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcription, setTranscription] = useState<string>('');
  const [error, setError] = useState<string>('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  
  useEffect(() => {
    // Nettoyage à la destruction du composant
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      // Réinitialiser les états
      setError('');
      setTranscription('');
      audioChunksRef.current = [];
      
      // Demander l'accès au microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Créer un nouveau MediaRecorder
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      // Configurer les événements du MediaRecorder
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        // Envoyer l'audio pour transcription
        transcribeAudio();
      };
      
      // Commencer l'enregistrement
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      setError("Erreur lors de l'accès au microphone. Veuillez vérifier vos permissions.");
      console.error("Erreur d'enregistrement:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Arrêter toutes les pistes audio
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  const transcribeAudio = async () => {
    if (audioChunksRef.current.length === 0) {
      setError("Aucun audio enregistré.");
      return;
    }
    
    try {
      setIsTranscribing(true);
      
      // Créer un objet Blob à partir des chunks audio
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      // Créer un FormData pour l'envoi à l'API OpenAI
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');
      formData.append('model', 'whisper-1');
      
      // Appeler l'API OpenAI pour la transcription
      const response = await axios.post(
        'https://api.openai.com/v1/audio/transcriptions',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      // Récupérer la transcription
      const result = response.data.text;
      setTranscription(result);
      
      // Appeler la fonction de callback avec la transcription et le blob audio
      onTranscriptionComplete(result, audioBlob);
      
    }
    //eslint-disable-next-line
    catch (err: any) {
      setError(`Erreur lors de la transcription: ${err.message}`);
      console.error('Erreur de transcription:', err);
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Enregistrement et Transcription</h2>
      
      <div className="flex justify-center mb-6">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isTranscribing}
          className={`px-6 py-3 rounded-lg font-semibold text-white ${
            isRecording 
              ? "bg-red-600 hover:bg-red-700" 
              : isTranscribing 
                ? "bg-gray-400 cursor-not-allowed" 
                : "bg-blue-600 hover:bg-blue-700"
          } transition-colors duration-300 flex items-center justify-center`}
        >
          {isRecording ? (
            <>
              <span className="mr-2">Arrêter l'enregistrement</span>
              <span className="h-3 w-3 bg-white rounded-full animate-pulse"></span>
            </>
          ) : isTranscribing ? (
            "Transcription en cours..."
          ) : (
            "Démarrer l'enregistrement"
          )}
        </button>
      </div>
      
      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-md mb-4">
          {error}
        </div>
      )}
      
      {transcription && (
        <div className="mt-4">
          <h3 className="text-lg font-medium mb-2">Transcription:</h3>
          <div className="p-4 bg-gray-100 rounded-md whitespace-pre-wrap">
            {transcription}
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioRecorderTranscriber;