import React, { useRef, useState } from 'react';
import { FaPaperclip, FaFile, FaImage, FaFilePdf, FaFileWord, FaFileExcel, FaTimes } from 'react-icons/fa';

const FileUploader = ({ onFileSelect, onCancel }) => {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check file size (max 15MB)
      if (file.size > 15 * 1024 * 1024) {
        alert('File size must be less than 15MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const getFileIcon = (file) => {
    const extension = file.name.split('.').pop().toLowerCase();
    const type = file.type.split('/')[0];
    
    if (type === 'image') return <FaImage className="text-blue-500" />;
    if (extension === 'pdf') return <FaFilePdf className="text-red-500" />;
    if (['doc', 'docx'].includes(extension)) return <FaFileWord className="text-blue-600" />;
    if (['xls', 'xlsx'].includes(extension)) return <FaFileExcel className="text-green-600" />;
    return <FaFile className="text-gray-500" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSend = () => {
    if (selectedFile) {
      onFileSelect(selectedFile);
      setSelectedFile(null);
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
      {!selectedFile ? (
        <div className="flex items-center space-x-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700"
          >
            <FaPaperclip />
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-300">
            Click to attach a file
          </span>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept="*/*"
          />
          <button
            onClick={onCancel}
            className="ml-auto p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FaTimes />
          </button>
        </div>
      ) : (
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gray-200 dark:bg-gray-600 rounded-lg">
            {getFileIcon(selectedFile)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {selectedFile.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatFileSize(selectedFile.size)}
            </p>
          </div>
          <button
            onClick={handleRemove}
            className="p-1 text-red-500 hover:text-red-700"
          >
            <FaTimes />
          </button>
          <button
            onClick={handleSend}
            className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUploader;