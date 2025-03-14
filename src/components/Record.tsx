declare const chrome: {
    tabCapture: {
      capture: (options: { audio: boolean; video: boolean }, callback: (stream: MediaStream | null) => void) => void;
    };
    runtime: {
      lastError?: { message: string };
    };
  };
  
  import { useState, useRef, useEffect } from 'react';
  import AudioRecorderTranscriber from './Transcriber';
  import AudioMegaUploader from './Mega';
  
  const AudioRecorder = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [audioURL, setAudioURL] = useState('');
    const [error, setError] = useState('');
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [transcription, setTranscription] = useState<string>('');
    const [megaCredentials, setMegaCredentials] = useState({
      email: '',
      password: '',
    });
    const [apiKey, setApiKey] = useState<string>('');
  
    const handleTranscriptionComplete = (text: string, blob: Blob) => {
      setTranscription(text);
      setAudioBlob(blob);
    };
  
    const startRecording = () => {
      // Réinitialiser les erreurs et l'état
      setError('');
      setAudioURL('');
      setAudioBlob(null);
      setTranscription('');
      audioChunksRef.current = [];
      
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
        
        mediaRecorderRef.current.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };
        
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const audioUrl = URL.createObjectURL(blob);
          setAudioURL(audioUrl);
          setAudioBlob(blob);
          
          // Libérer le flux
          stream.getTracks().forEach(track => track.stop());
        };
        
        // Déclencher ondataavailable toutes les secondes
        mediaRecorderRef.current.start(1000);
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
  
    // Nettoyage au démontage du composant
    useEffect(() => {
      return () => {
        if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
        }
      };
    }, [isRecording]);
  
    return (
      <div className="flex flex-col items-center p-6 bg-gray-100 rounded-lg shadow-md w-full max-w-md mx-auto">
        <h2 className="text-2xl font-bold mb-6">Enregistreur Audio</h2>
        
        {/* Configuration OpenAI et Mega */}
        <div className="w-full mb-6">
          <div className="mb-4">
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
              Clé API OpenAI
            </label>
            <input
              type="password"
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              placeholder="sk-..."
            />
          </div>
          <div className="mb-4">
            <label htmlFor="megaEmail" className="block text-sm font-medium text-gray-700 mb-1">
              Email Mega
            </label>
            <input
              type="email"
              id="megaEmail"
              value={megaCredentials.email}
              onChange={(e) => setMegaCredentials(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              placeholder="exemple@email.com"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="megaPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe Mega
            </label>
            <input
              type="password"
              id="megaPassword"
              value={megaCredentials.password}
              onChange={(e) => setMegaCredentials(prev => ({ ...prev, password: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              placeholder="Mot de passe"
            />
          </div>
        </div>
        
        {/* Bouton d'enregistrement */}
        <button
          onClick={toggleRecording}
          className={`w-full mb-4 px-6 py-3 rounded-full font-bold text-white ${
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
        
        {/* Affichage des erreurs */}
        {error && (
          <div className="w-full mt-4 mb-4 p-3 bg-red-100 text-red-700 rounded-md text-center">
            {error}
          </div>
        )}
  
        {/* Lecteur audio */}
        {audioURL && (
          <div className="w-full mt-4 mb-6">
            <h3 className="text-lg font-medium mb-2">Enregistrement</h3>
            <audio src={audioURL} controls className="w-full mt-2" />
            <div className="mt-2 text-sm text-gray-600">
              Vous pouvez télécharger l'audio en cliquant avec le bouton droit sur le lecteur.
            </div>
          </div>
        )}
        
        {/* Composants de transcription et upload */}
        {audioBlob && (
          <>
            <div className="w-full mb-6">
              <AudioRecorderTranscriber 
                onTranscriptionComplete={handleTranscriptionComplete}
                apiKey={apiKey}
                audioBlob={audioBlob}
              />
            </div>
            
            <div className="w-full mb-6">
              <AudioMegaUploader 
                audioBlob={audioBlob}
                email={megaCredentials.email}
                password={megaCredentials.password}
              />
            </div>
          </>
        )}
        
        {/* Résultat de la transcription */}
        {transcription && (
          <div className="w-full p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Résultat de la transcription</h2>
            <p className="whitespace-pre-wrap">{transcription}</p>
          </div>
        )}
      </div>
    );
  };
  
  export default AudioRecorder;