from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class Token(Base):
    __tablename__ = "token"

    tokenID = Column(String(300), primary_key=True, index=True)
    # Tambahkan kolom lain di sini jika ada, misalnya nilai tokennya

    # Relasi
    respondens = relationship("Responden", back_populates="token")
    akuns = relationship("Akun", back_populates="token")


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
    fotos = relationship("Foto", back_populates="file")



class Responden(Base):
    __tablename__ = "responden"

    respID = Column(Integer, primary_key=True, index=True)
    acaraID = Column(Integer, ForeignKey("acara.acaraID"))
    tokenID = Column(String(300), ForeignKey("token.tokenID"))
    nama = Column(String(255))
    prodi_instansi = Column(String(255))
    nomor = Column(String(50))
    nim = Column(String(50))
    

    # Relasi
    acara = relationship("Acara", back_populates="respondens")
    token = relationship("Token", back_populates="respondens")
    pilihans = relationship("Pilihan", back_populates="responden")


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

class Akun(Base):
    __tablename__ = "akun"

    akunID = Column(Integer, primary_key=True, index=True)
    tokenID = Column(String(300), ForeignKey("token.tokenID"), nullable=True)
    username = Column(String(255), unique=True, index=True)
    hashed_password = Column(String(255))
    salt = Column(String(255))
    role = Column(String(50))
    
    # Relasi
    token = relationship("Token", back_populates="akuns")
    akses = relationship("Akses", back_populates="akun")


class Bidang(Base):
    __tablename__ = "bidang"

    bidangID = Column(Integer, primary_key=True, index=True)
    nama = Column(String(255), nullable=False)

    # Relasi
    akses = relationship("Akses", back_populates="bidang")

class Akses(Base):
    __tablename__ = "akses"

    bidangID = Column(Integer, ForeignKey("bidang.bidangID"), primary_key=True)
    akunID = Column(Integer, ForeignKey("akun.akunID"), primary_key=True)

    # Relasi
    akun = relationship("Akun", back_populates="akses")
    bidang = relationship("Bidang", back_populates="akses")

class Foto(Base):
    __tablename__ = "foto"

    fotoID = Column(Integer, primary_key=True, index=True)
    albumID = Column(Integer, ForeignKey("album.albumID"))
    nama = Column(String(255))
    pemilik = Column(String(255))
    fileID = Column(Integer, ForeignKey("file.fileID"))

    # Relasi
    file = relationship("File", back_populates="fotos")
    album = relationship("Album", back_populates="fotos")

class Album(Base):
    __tablename__ = "album"

    albumID = Column(Integer, primary_key=True, index=True)
    nama = Column(String(255), nullable=False)
    deskripsi = Column(Text, nullable=True)

    # Relasi
    fotos = relationship("Foto", back_populates="album")