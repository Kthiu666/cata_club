export interface LandingStat {
  value: string;
  numericValue?: number;
  prefix?: string;
  label: string;
}

export interface LandingSchedule {
  category: string;
  audience: string;
  hours: string;
  days: string;
}

export interface LandingContact {
  whatsapp: string[];
  facebook: string;
  instagram: string;
  hours: string;
}

export interface LandingConfig {
  stats: LandingStat[];
  schedules: LandingSchedule[];
  contact: LandingContact;
}

export const landingConfig: LandingConfig = {
  stats: [
    {
      value: "2013",
      numericValue: 2013,
      label: "Fundado el 10 de octubre",
    },
    {
      // TODO(client): Confirm the club's current number of years training athletes.
      value: "+12",
      numericValue: 12,
      prefix: "+",
      label: "Años formando deportistas",
    },
    {
      // TODO(client): Confirm the current number of athletes in training.
      value: "+80",
      numericValue: 80,
      prefix: "+",
      label: "Deportistas en formación",
    },
    {
      value: "Loja",
      label: "Junto al Coliseo Ciudad de Loja",
    },
  ],
  schedules: [
    {
      category: "Formativo",
      audience: "5 a 10 años",
      hours: "15:00 – 16:00",
      days: "Lunes a Viernes",
    },
    {
      category: "Infantil",
      audience: "8 a 12 años",
      hours: "16:00 – 17:00",
      days: "Lunes a Viernes",
    },
    {
      category: "Juvenil",
      audience: "Mayores de 12 años",
      hours: "17:00 – 18:00",
      days: "Lunes a Viernes",
    },
    {
      category: "Competitivo",
      audience: "Selección",
      hours: "18:00 – 20:00",
      days: "Lunes a Sábado",
    },
    {
      category: "Adultos",
      audience: "Mayores de 18 años",
      hours: "20:00 – 21:15",
      days: "Lunes a Viernes",
    },
  ],
  contact: {
    whatsapp: ["0994219619", "0990288152"],
    facebook: "https://www.facebook.com/share/1FN5DkgzXG/",
    instagram: "https://www.instagram.com/cataclub_tenis_de_mesa",
    // TODO(client): Confirm the public contact hours.
    hours: "Lun – Sáb · 16:00 – 20:30",
  },
};
