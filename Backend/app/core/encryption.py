"""AES-256-GCM encryption utility untuk API key pool chatbot.

Hanya dipakai secara internal oleh ApiKeyPool.
JANGAN pernah log atau print hasil decrypt() — hanya gunakan di memory.
"""
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


class KeyEncryption:
    """Enkripsi/dekripsi API key menggunakan AES-256-GCM.

    Master key (32 bytes) dibaca dari environment variable CHATBOT_MASTER_KEY
    sebagai 64-char hex string.

    Contoh generate master key:
        python -c "import secrets; print(secrets.token_hex(32))"
    """

    def __init__(self, master_key_hex: str) -> None:
        if len(master_key_hex) != 64:
            raise ValueError(
                "CHATBOT_MASTER_KEY harus berupa 64-char hex string (32 bytes). "
                "Generate dengan: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        self._aesgcm = AESGCM(bytes.fromhex(master_key_hex))

    def encrypt(self, plaintext: str) -> tuple[bytes, bytes, bytes]:
        """Enkripsi plaintext dan return (ciphertext, nonce, tag).

        Args:
            plaintext: API key yang akan dienkripsi.

        Returns:
            Tuple (ciphertext, nonce, tag) — ketiganya disimpan terpisah di DB.
        """
        nonce = os.urandom(12)  # GCM standard: 96-bit nonce, unik tiap enkripsi
        # AESGCM.encrypt() mengembalikan ciphertext + 16-byte auth tag digabung
        ct_with_tag = self._aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
        ciphertext = ct_with_tag[:-16]
        tag = ct_with_tag[-16:]
        return ciphertext, nonce, tag

    def decrypt(self, ciphertext: bytes, nonce: bytes, tag: bytes) -> str:
        """Dekripsi ciphertext dan return plaintext API key.

        PERHATIAN: Jangan log, print, atau simpan return value ke disk.
        Gunakan hanya di memory saat runtime.

        Raises:
            cryptography.exceptions.InvalidTag: Jika data rusak atau master key salah.
        """
        ct_with_tag = ciphertext + tag
        return self._aesgcm.decrypt(nonce, ct_with_tag, None).decode("utf-8")

    @staticmethod
    def make_preview(api_key: str) -> str:
        """Buat masked preview untuk ditampilkan di admin panel.

        Contoh: "AIzaSyD...xQ7" dari "AIzaSyDabcdefghijklmnopqrstuvwxQ7"
        """
        if len(api_key) <= 8:
            return "****"
        return f"{api_key[:4]}...{api_key[-3:]}"
