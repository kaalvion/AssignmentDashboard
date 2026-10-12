import React, { useState, useRef } from 'react';
import axios from 'axios';
import api from '../services/api';
import { UploadCloud, CheckCircle2, AlertTriangle, X, FileText, Loader2 } from 'lucide-react';

export default function PdfUploadModal({ assignment, isOpen, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successData, setSuccessData] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen || !assignment) return null;

  const handleFileChange = (e) => {
    setErrorMessage('');
    const selected = e.target.files[0];
    if (!selected) return;

    // Client-side validations
    if (!selected.name.toLowerCase().endsWith('.pdf') && selected.type !== 'application/pdf') {
      setErrorMessage('Invalid file type. Only PDF documents (.pdf) are accepted.');
      setFile(null);
      return;
    }

    if (selected.size > 10 * 1024 * 1024) {
      setErrorMessage('File exceeds the maximum allowed 10 MB limit.');
      setFile(null);
      return;
    }

    if (selected.size === 0) {
      setErrorMessage('File is empty (0 bytes). Please choose a valid PDF.');
      setFile(null);
      return;
    }

    setFile(selected);
  };

  const handleUpload = async () => {
    if (!file) {
      setErrorMessage('Please select a PDF file to upload.');
      return;
    }

    setErrorMessage('');
    setUploading(true);
    setProgress(5);
    setStatusMessage('1/3: Requesting signed upload authorization...');

    try {
      // 1. Get short-lived signed upload URL
      const urlRes = await api.post(`/assignments/${assignment.id}/submission/upload-url`);
      if (!urlRes || !urlRes.success || !urlRes.data?.uploadUrl) {
        throw new Error(urlRes?.message || 'Failed to acquire upload authorization URL.');
      }

      const { uploadUrl } = urlRes.data;

      // 2. Direct browser-to-GCS upload via PUT
      setStatusMessage('2/3: Uploading PDF directly to secure storage...');
      try {
        await axios.put(uploadUrl, file, {
          headers: {
            'Content-Type': 'application/pdf',
            'x-goog-content-length-range': '0,10485760'
          },
          onUploadProgress: (evt) => {
            if (evt.total) {
              const p = Math.round((evt.loaded * 80) / evt.total);
              setProgress(10 + p);
            }
          }
        });
      } catch (uploadErr) {
        if (uploadErr.code === 'ERR_NETWORK' || uploadErr.message?.includes('Network Error')) {
          throw new Error('Upload blocked by network or storage CORS. Check storage CORS settings.');
        }
        throw new Error(uploadErr.response?.data?.message || uploadErr.message || 'Storage upload failed.');
      }

      // 3. Confirm with backend to validate file & trigger point transactions
      setProgress(95);
      setStatusMessage('3/3: Verifying PDF header and confirming submission...');

      const confirmRes = await api.post(`/assignments/${assignment.id}/submission/confirm`);
      if (!confirmRes || !confirmRes.success) {
        throw new Error(confirmRes?.message || 'Verification failed on server.');
      }

      setProgress(100);
      setSuccessData(confirmRes.data);
      setStatusMessage('Submission confirmed successfully!');

      setTimeout(() => {
        if (onSuccess) onSuccess(confirmRes.data);
      }, 1200);

    } catch (err) {
      console.error('Submission error:', err);
      const msg = err.response?.data?.message || err.message || 'Submission failed. Please try again.';
      setErrorMessage(msg);
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const isResubmission = assignment.submissionStatus === 'ON_TIME' || assignment.submissionStatus === 'LATE';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1.5rem'
    }}>
      <div style={{
        maxWidth: '540px',
        width: '100%',
        background: 'var(--bg-card, #1e293b)',
        border: '1px solid var(--border-color, #334155)',
        borderRadius: 'var(--radius-lg, 16px)',
        padding: '2rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        color: 'var(--text-primary, #f8fafc)',
        position: 'relative'
      }}>
        {/* Close Button */}
        {!uploading && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1.25rem',
              right: '1.25rem',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted, #94a3b8)',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>
        )}

        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            {isResubmission ? 'Resubmit Assignment PDF' : 'Upload Assignment Submission'}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #94a3b8)', margin: '4px 0 0' }}>
            {assignment.title} • {assignment.subject || 'Class Assignment'}
          </p>
        </div>

        {errorMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm, 8px)',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            fontSize: '0.85rem',
            marginBottom: '1.25rem'
          }}>
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {successData ? (
          <div style={{
            textAlign: 'center',
            padding: '2rem 1rem',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md, 12px)',
            marginBottom: '1rem'
          }}>
            <CheckCircle2 size={48} style={{ color: '#10b981', margin: '0 auto 0.75rem' }} />
            <h4 style={{ fontSize: '1.15rem', color: '#10b981', margin: 0 }}>
              Submitted Successfully!
            </h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '8px 0 0' }}>
              Status: <strong style={{ color: successData.status === 'ON_TIME' ? '#10b981' : '#f59e0b' }}>{successData.status}</strong>
              {successData.pointsAwarded > 0 && (
                <span> • <strong>+{successData.pointsAwarded} pts</strong> awarded!</span>
              )}
              {successData.isEarlyBonus && (
                <span style={{ display: 'block', color: '#8b5cf6', fontSize: '0.8rem', marginTop: '4px' }}>
                  ⚡ Includes 30% Early Bird Bonus!
                </span>
              )}
            </p>
          </div>
        ) : (
          <>
            {/* Drop Zone / File Picker */}
            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--border-color, #475569)',
                borderRadius: 'var(--radius-md, 12px)',
                padding: '2rem 1.5rem',
                textAlign: 'center',
                cursor: uploading ? 'default' : 'pointer',
                background: file ? 'rgba(99, 102, 241, 0.08)' : 'rgba(15, 23, 42, 0.4)',
                transition: 'all 0.2s ease',
                marginBottom: '1.25rem'
              }}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,application/pdf"
                style={{ display: 'none' }}
                disabled={uploading}
              />

              {file ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={36} style={{ color: 'var(--primary, #6366f1)' }} />
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{file.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready to submit
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <UploadCloud size={40} style={{ color: 'var(--primary, #6366f1)' }} />
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                    Click to select PDF file
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Max file size: 10 MB • Format: .pdf only
                  </div>
                </div>
              )}
            </div>

            {/* Progress indicator */}
            {uploading && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  <span>{statusMessage}</span>
                  <span>{progress}%</span>
                </div>
                <div style={{
                  width: '100%',
                  height: '6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${progress}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--primary) 0%, #10b981 100%)',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={uploading}
                className="btn btn-secondary"
                style={{ padding: '0.65rem 1.25rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={!file || uploading}
                className="btn btn-primary"
                style={{
                  padding: '0.65rem 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: 600
                }}
              >
                {uploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <span>{isResubmission ? 'Resubmit PDF' : 'Upload Submission'}</span>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
