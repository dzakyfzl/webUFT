"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode, JwtPayload } from "jwt-decode";
import KelolaSertifikat from '../../components/subdashboard/KelolaSertifikat';

interface CustomJwtPayload extends JwtPayload {
  access?: string[];
  role?: string;
}

export default function SertifPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('access_token');

    if (!token) {
      router.push('/admin/login');
      return;
    }

    try {
      const decodedToken = jwtDecode<CustomJwtPayload>(token);
      const userAccess = decodedToken.access || [];

      // Proteksi: hanya user dengan akses 'Certificate' yang boleh masuk
      if (!userAccess.includes('Certificate')) {
        router.push('/admin/login');
      }
    } catch (error) {
      console.error("Token tidak valid:", error);
      router.push('/admin/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0f0f11]">
      <KelolaSertifikat />
    </div>
  );
}
