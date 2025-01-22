'use client'

import { useState } from 'react';
import UploadDialog from '@/components/upload/UploadDialog';

export default function Homepage() {
  const [isUploadFormOpen, setIsUploadFormOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setIsUploadFormOpen(true)} className="primary-button">
        Open Upload Form
      </button>
      <UploadDialog isOpen={isUploadFormOpen} setIsOpen={setIsUploadFormOpen} />
    </div>
  );
}