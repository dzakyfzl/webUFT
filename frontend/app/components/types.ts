export type Acara = {
  id: string | number;
  title: string;
  description: string;
  waktu: string;
  tempat: string;
  image: string;
  link: string;
  status: string;
};

export type Koleksi = {
  id: number;
  title: string;
  photographer: string;
  category: string;
  image: string;
  span: string;
  description?: string;
  exif?: string;
};

export type KoleksiOrigin = {
  top: number;
  left: number;
  width: number;
  height: number;
};
