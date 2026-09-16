'use client';

import React, { useState, useEffect, useRef } from 'react';

interface P2PTransferModalProps {
  initialRoomId?: string | null;
  onClose?: () => void;
}

const CHUNK_SIZE = 64 * 1024; // 64 KB binary chunks

export default function P2PTransferModal({ initialRoomId = null, onClose }: P2PTransferModalProps) {
  const [role, setRole] = useState<'sender' | 'receiver'>(initialRoomId ? 'receiver' : 'sender');
  const [roomId, setRoomId] = useState<string>(initialRoomId || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [transferredBytes, setTransferredBytes] = useState<number>(0);
  const [transferSpeed, setTransferSpeed] = useState<string>('0 MB/s');
  const [p2pUrl, setP2pUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [receivedFileName, setReceivedFileName] = useState<string>('');
  const [receivedFileSize, setReceivedFileSize] = useState<number>(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const receivedChunksRef = useRef<ArrayBuffer[]>([]);
  const receivedBytesRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const signalIntervalRef = useRef<any>(null);

  // Generate a room ID if in sender mode
  useEffect(() => {
    if (role === 'sender' && !roomId) {
      const newRoom = 'p2p-' + Math.random().toString(36).substring(2, 9);
      setRoomId(newRoom);
      if (typeof window !== 'undefined') {
        setP2pUrl(`${window.location.origin}/p2p?room=${newRoom}`);
      }
    } else if (role === 'receiver' && roomId && typeof window !== 'undefined') {
      setP2pUrl(`${window.location.origin}/p2p?room=${roomId}`);
    }
  }, [role, roomId]);

  const setupPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    pc.onicecandidate = async (event) => {
      if (event.candidate && roomId) {
        await fetch('/api/p2p/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId,
            type: 'candidate',
            payload: event.candidate,
          }),
        });
      }
    };

    pcRef.current = pc;
    return pc;
  };

  // Start P2P Sender logic
  const handleStartSender = async () => {
    if (!selectedFile || !roomId) return;

    setStatus('waiting_for_receiver');
    const pc = setupPeerConnection();

    // Create DataChannel
    const dc = pc.createDataChannel('codedropP2P');
    dc.binaryType = 'arraybuffer';
    dcRef.current = dc;

    dc.onopen = () => {
      setStatus('transferring');
      sendFileInChunks(dc, selectedFile);
    };

    // Create SDP Offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Send SDP Offer with file metadata
    await fetch('/api/p2p/signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        type: 'offer',
        payload: {
          sdp: offer,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
        },
      }),
    });

    // Poll for SDP Answer & ICE Candidates
    const processedCandidates = new Set<string>();
    signalIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/p2p/signal?roomId=${roomId}`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.answer && !pc.currentRemoteDescription) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        }

        if (Array.isArray(data.candidates)) {
          for (const cand of data.candidates) {
            const key = JSON.stringify(cand);
            if (!processedCandidates.has(key) && pc.remoteDescription) {
              processedCandidates.add(key);
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            }
          }
        }
      } catch (err) {
        console.error('Sender signaling poll error:', err);
      }
    }, 1500);
  };

  // Sender function to stream chunks
  const sendFileInChunks = async (dc: RTCDataChannel, file: File) => {
    startTimeRef.current = Date.now();
    let offset = 0;
    const total = file.size;

    while (offset < total) {
      if (dc.readyState !== 'open') break;

      // Handle backpressure
      if (dc.bufferedAmount > 4 * CHUNK_SIZE) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        continue;
      }

      const slice = file.slice(offset, offset + CHUNK_SIZE);
      const buffer = await slice.arrayBuffer();
      dc.send(buffer);

      offset += buffer.byteLength;
      const currentPercent = Math.min(100, Math.round((offset / total) * 100));
      setProgress(currentPercent);
      setTransferredBytes(offset);

      const elapsedSec = (Date.now() - startTimeRef.current) / 1000;
      if (elapsedSec > 0) {
        const speedMBs = (offset / (1024 * 1024)) / elapsedSec;
        setTransferSpeed(`${speedMBs.toFixed(1)} MB/s`);
      }
    }

    if (signalIntervalRef.current) clearInterval(signalIntervalRef.current);
    setStatus('completed');
  };

  // Start Receiver logic
  const handleConnectReceiver = async () => {
    if (!roomId) return;
    setStatus('connecting');

    const pc = setupPeerConnection();

    // Listen for incoming DataChannel
    pc.ondatachannel = (event) => {
      const dc = event.channel;
      dc.binaryType = 'arraybuffer';
      dcRef.current = dc;

      dc.onopen = () => {
        setStatus('transferring');
        startTimeRef.current = Date.now();
      };

      dc.onmessage = (e) => {
        const chunk = e.data as ArrayBuffer;
        receivedChunksRef.current.push(chunk);
        receivedBytesRef.current += chunk.byteLength;

        setTransferredBytes(receivedBytesRef.current);

        if (receivedFileSize > 0) {
          const currentPercent = Math.min(100, Math.round((receivedBytesRef.current / receivedFileSize) * 100));
          setProgress(currentPercent);

          const elapsedSec = (Date.now() - startTimeRef.current) / 1000;
          if (elapsedSec > 0) {
            const speedMBs = (receivedBytesRef.current / (1024 * 1024)) / elapsedSec;
            setTransferSpeed(`${speedMBs.toFixed(1)} MB/s`);
          }

          if (receivedBytesRef.current >= receivedFileSize) {
            triggerFileDownload();
          }
        }
      };
    };

    // Poll for Sender's SDP Offer
    const processedCandidates = new Set<string>();
    signalIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/p2p/signal?roomId=${roomId}`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.offer && !pc.currentRemoteDescription) {
          const offerPayload = data.offer;
          setReceivedFileName(offerPayload.fileName || 'p2p-shared-file');
          setReceivedFileSize(offerPayload.fileSize || 0);

          await pc.setRemoteDescription(new RTCSessionDescription(offerPayload.sdp));

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          // Post SDP Answer
          await fetch('/api/p2p/signal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              roomId,
              type: 'answer',
              payload: answer,
            }),
          });
        }

        if (Array.isArray(data.candidates)) {
          for (const cand of data.candidates) {
            const key = JSON.stringify(cand);
            if (!processedCandidates.has(key) && pc.remoteDescription) {
              processedCandidates.add(key);
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            }
          }
        }
      } catch (err) {
        console.error('Receiver signaling poll error:', err);
      }
    }, 1500);
  };

  const triggerFileDownload = () => {
    if (signalIntervalRef.current) clearInterval(signalIntervalRef.current);
    const blob = new Blob(receivedChunksRef.current);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = receivedFileName || 'downloaded-p2p-file';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatus('completed');
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(p2pUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-xl mx-auto rounded-2xl bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/30 dark:border-slate-800 p-6 sm:p-8 shadow-xl flex flex-col gap-6">
      
      {/* Title Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-outline-variant/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary dark:text-primary-fixed-dim flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">bolt</span>
          </div>
          <div>
            <h3 className="text-headline-sm font-bold text-on-surface dark:text-slate-100">WebRTC Direct P2P Transfer</h3>
            <p className="text-label-sm text-on-surface-variant dark:text-slate-400">Zero cloud storage used • Unlimited file size</p>
          </div>
        </div>

        {onClose && (
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        )}
      </div>

      {/* Role Switcher */}
      {status === 'idle' && (
        <div className="grid grid-cols-2 p-1 bg-surface-container dark:bg-slate-800 rounded-xl">
          <button
            onClick={() => setRole('sender')}
            className={`py-2 text-center rounded-lg text-body-sm font-semibold transition-all ${
              role === 'sender'
                ? 'bg-surface-container-lowest dark:bg-slate-900 text-on-surface dark:text-slate-100 shadow-sm'
                : 'text-on-surface-variant dark:text-slate-400'
            }`}
          >
            Send File
          </button>
          <button
            onClick={() => setRole('receiver')}
            className={`py-2 text-center rounded-lg text-body-sm font-semibold transition-all ${
              role === 'receiver'
                ? 'bg-surface-container-lowest dark:bg-slate-900 text-on-surface dark:text-slate-100 shadow-sm'
                : 'text-on-surface-variant dark:text-slate-400'
            }`}
          >
            Receive File
          </button>
        </div>
      )}

      {/* SENDER MODE */}
      {role === 'sender' && (
        <div className="flex flex-col gap-5">
          {status === 'idle' && (
            <>
              {/* File Select */}
              <label className="border-2 border-dashed border-outline-variant/40 dark:border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary transition-all bg-surface-container-low dark:bg-slate-800/40">
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <span className="material-symbols-outlined text-[36px] text-primary mb-2">upload_file</span>
                {selectedFile ? (
                  <div className="flex flex-col">
                    <span className="text-body-md font-bold text-on-surface dark:text-slate-100">{selectedFile.name}</span>
                    <span className="text-label-sm font-mono text-on-surface-variant">{formatSize(selectedFile.size)}</span>
                  </div>
                ) : (
                  <div>
                    <p className="text-body-sm font-semibold text-on-surface dark:text-slate-100">Click to select any size file</p>
                    <p className="text-label-xs font-mono text-on-surface-variant mt-1">Direct browser-to-browser P2P transfer</p>
                  </div>
                )}
              </label>

              {selectedFile && (
                <>
                  {/* Share Link Box */}
                  <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/20 flex items-center justify-between text-body-xs font-mono">
                    <span className="truncate max-w-[280px] text-on-surface">{p2pUrl}</span>
                    <button
                      onClick={handleCopyUrl}
                      className="px-3 py-1 bg-primary text-on-primary font-sans text-label-xs font-semibold rounded-lg hover:bg-primary-container flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">{copied ? 'check' : 'content_copy'}</span>
                      <span>{copied ? 'Copied' : 'Copy P2P Link'}</span>
                    </button>
                  </div>

                  <button
                    onClick={handleStartSender}
                    className="w-full h-11 bg-primary hover:bg-primary-container text-on-primary font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[20px]">sensors</span>
                    Start P2P Transfer Connection
                  </button>
                </>
              )}
            </>
          )}

          {status === 'waiting_for_receiver' && (
            <div className="py-8 flex flex-col items-center justify-center text-center gap-4">
              <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <div>
                <h4 className="text-headline-sm font-bold text-on-surface dark:text-slate-100">Waiting for receiver to join...</h4>
                <p className="text-body-sm text-on-surface-variant mt-1">Keep this tab open. Share the P2P link with the recipient.</p>
              </div>

              <div className="w-full p-3 bg-surface-container-low rounded-xl border border-outline-variant/20 flex items-center justify-between text-body-xs font-mono">
                <span className="truncate max-w-[280px] text-on-surface">{p2pUrl}</span>
                <button
                  onClick={handleCopyUrl}
                  className="px-3 py-1 bg-primary text-on-primary font-sans text-label-xs font-semibold rounded-lg hover:bg-primary-container flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">{copied ? 'check' : 'content_copy'}</span>
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          )}

          {status === 'transferring' && (
            <div className="py-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-body-sm font-semibold text-on-surface dark:text-slate-100 truncate max-w-[240px]">
                  Streaming '{selectedFile?.name}'
                </span>
                <span className="text-label-sm font-mono text-primary font-bold">{transferSpeed}</span>
              </div>

              <div className="w-full h-3 bg-surface-container-high rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all duration-200" style={{ width: `${progress}%` }} />
              </div>

              <div className="flex items-center justify-between text-label-sm font-mono text-on-surface-variant">
                <span>{formatSize(transferredBytes)} / {formatSize(selectedFile?.size || 0)}</span>
                <span>{progress}%</span>
              </div>
            </div>
          )}

          {status === 'completed' && (
            <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-tertiary/10 text-tertiary flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px]">check_circle</span>
              </div>
              <h4 className="text-headline-sm font-bold text-on-surface dark:text-slate-100">Transfer Complete!</h4>
              <p className="text-body-sm text-on-surface-variant font-mono">
                Successfully streamed '{selectedFile?.name}' directly to receiver browser.
              </p>
              <button
                onClick={() => {
                  setStatus('idle');
                  setSelectedFile(null);
                }}
                className="mt-2 px-4 py-2 bg-surface-container text-on-surface font-semibold rounded-xl hover:bg-surface-container-high text-body-sm"
              >
                Send Another File
              </button>
            </div>
          )}
        </div>
      )}

      {/* RECEIVER MODE */}
      {role === 'receiver' && (
        <div className="flex flex-col gap-5">
          {status === 'idle' && (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-label-md font-mono font-semibold text-on-surface">Enter P2P Room Code or Link:</label>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.replace(/^.*[?&]room=/, ''))}
                  placeholder="e.g. p2p-a1b2c3d"
                  className="w-full h-11 px-4 bg-surface-container-low rounded-xl font-mono text-body-sm text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <button
                onClick={handleConnectReceiver}
                disabled={!roomId}
                className="w-full h-11 bg-primary hover:bg-primary-container text-on-primary font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[20px]">downloading</span>
                Connect & Receive File
              </button>
            </>
          )}

          {status === 'connecting' && (
            <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <h4 className="text-headline-sm font-bold text-on-surface dark:text-slate-100">Connecting to sender...</h4>
              <p className="text-body-sm text-on-surface-variant font-mono">Handshaking via P2P signal room '{roomId}'</p>
            </div>
          )}

          {status === 'transferring' && (
            <div className="py-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-body-sm font-semibold text-on-surface dark:text-slate-100 truncate max-w-[240px]">
                  Receiving '{receivedFileName || 'File'}'
                </span>
                <span className="text-label-sm font-mono text-primary font-bold">{transferSpeed}</span>
              </div>

              <div className="w-full h-3 bg-surface-container-high rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all duration-200" style={{ width: `${progress}%` }} />
              </div>

              <div className="flex items-center justify-between text-label-sm font-mono text-on-surface-variant">
                <span>{formatSize(transferredBytes)} / {formatSize(receivedFileSize)}</span>
                <span>{progress}%</span>
              </div>
            </div>
          )}

          {status === 'completed' && (
            <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-tertiary/10 text-tertiary flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px]">download_done</span>
              </div>
              <h4 className="text-headline-sm font-bold text-on-surface dark:text-slate-100">Download Complete!</h4>
              <p className="text-body-sm text-on-surface-variant font-mono">
                Successfully received and saved '{receivedFileName}'.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
