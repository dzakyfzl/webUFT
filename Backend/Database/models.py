from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class Token(Base):
    __tablename__ = "token"

    tokenID = Column(String(255), primary_key=True, index=True)
    # Tambahkan kolom lain di sini jika ada, misalnya nilai tokennya

    # Relasi
    respondens = relationship("Responden", back_populates="token")


class Acara(Base):
    __tablename__ = "acara"

    acaraID = Column(Integer, primary_key=True, index=True)
    fileID = Column(Integer, ForeignKey("file.fileID"))
    nama = Column(String(255), nullable=False)
    deskripsi = Column(Text)
    tempat = Column(String(255))
    waktu = Column(DateTime)
    status = Column(String(50))

    # Relasi
    file = relationship("File", back_populates="acaras")
    respondens = relationship("Responden", back_populates="acara")
    pertanyaans = relationship("Pertanyaan", back_populates="acara")
    karyas = relationship("Karya", back_populates="acara")


class File(Base):
    __tablename__ = "file"

    fileID = Column(Integer, primary_key=True, index=True)
    nama = Column(String(255))
    jenis = Column(String(50))
    ukuran = Column(Integer)
    direktori = Column(String(500))

    # Relasi
    acaras = relationship("Acara", back_populates="file")
    karyas = relationship("Karya", back_populates="file")


class Pertanyaan(Base):
    __tablename__ = "pertanyaan"

    pertanyaanID = Column(Integer, primary_key=True, index=True)
    acaraID = Column(Integer, ForeignKey("acara.acaraID"))
    isNumber = Column(Boolean, default=False)
    isWajib = Column(Boolean, default=True)
    pertanyaan = Column(Text)

    # Relasi
    acara = relationship("Acara", back_populates="pertanyaans")
    jawabans = relationship("Jawaban", back_populates="pertanyaan")


class Responden(Base):
    __tablename__ = "responden"

    respID = Column(Integer, primary_key=True, index=True)
    acaraID = Column(Integer, ForeignKey("acara.acaraID"))
    tokenID = Column(String(255), ForeignKey("token.tokenID"))
    nama = Column(String(255))
    prodi_instansi = Column(String(255))
    nomor = Column(String(50))
    nim = Column(String(50))
    

    # Relasi
    acara = relationship("Acara", back_populates="respondens")
    token = relationship("Token", back_populates="respondens")
    jawabans = relationship("Jawaban", back_populates="responden")
    pilihans = relationship("Pilihan", back_populates="responden")


class Jawaban(Base):
    __tablename__ = "jawaban"

    jawabanID = Column(Integer, primary_key=True, index=True)
    pertanyaanID = Column(Integer, ForeignKey("pertanyaan.pertanyaanID"))
    respondenID = Column(Integer, ForeignKey("responden.respID"))
    jawaban = Column(Text)

    # Relasi
    pertanyaan = relationship("Pertanyaan", back_populates="jawabans")
    responden = relationship("Responden", back_populates="jawabans")


class Karya(Base):
    __tablename__ = "karya"

    karyaID = Column(Integer, primary_key=True, index=True)
    acaraID = Column(Integer, ForeignKey("acara.acaraID"))
    fileID = Column(Integer, ForeignKey("file.fileID"))
    nama = Column(String(255))
    deskripsi = Column(Text)
    pemilik = Column(String(255))

    # Relasi
    acara = relationship("Acara", back_populates="karyas")
    file = relationship("File", back_populates="karyas")
    pilihans = relationship("Pilihan", back_populates="karya")


class Pilihan(Base):
    __tablename__ = "pilihan"

    # Tabel Pilihan adalah tabel pivot/junction. Kita gunakan Composite Primary Key.
    respID = Column(Integer, ForeignKey("responden.respID"), primary_key=True)
    karyaID = Column(Integer, ForeignKey("karya.karyaID"), primary_key=True)

    # Relasi
    responden = relationship("Responden", back_populates="pilihans")
    karya = relationship("Karya", back_populates="pilihans")