'use client';

import { SelectionProvider } from '@/context/SelectionContext';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
    return (
        <SelectionProvider>
            {children}
        </SelectionProvider>
    );
}
