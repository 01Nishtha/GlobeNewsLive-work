'use client';

import React from 'react';
import Globe from '@/components/ui/globe';

interface Globe3DProps {
  autoRotate?: boolean;
  className?: string;
}

export default function Globe3D({ className }: Globe3DProps) {
  return <Globe className={className} />;
}
