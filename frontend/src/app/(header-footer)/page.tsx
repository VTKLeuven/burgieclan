'use client'

import { useState } from 'react';
import UploadForm from '@/components/upload/UploadForm';

export default function Homepage() {
  const [isUploadFormOpen, setIsUploadFormOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setIsUploadFormOpen(true)} className="primary-button">
        Open Upload Form
      </button>
      <UploadForm isOpen={isUploadFormOpen} setIsOpen={setIsUploadFormOpen} />
    </div>
  );
}