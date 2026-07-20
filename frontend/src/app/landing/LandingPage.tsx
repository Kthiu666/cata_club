import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Eye,
  Facebook,
  Instagram,
  MapPin,
  Navigation,
  Phone,
  Star,
  Target,
  Trophy,
} from "lucide-react";
import LandingMap from "./LandingMap";
import LandingMotion from "./LandingMotion";
import { landingConfig, type LandingSchedule } from "./landing-config";

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  dark?: boolean;
}

interface ScheduleCardProps extends LandingSchedule {}

interface ValueCardProps {
  title: string;
  children: React.ReactNode;
}

interface GalleryItem {
  src: string;
  alt: string;
  caption: string;
}

const GALLERY_ITEMS: GalleryItem[] = [
  {
    src: "/landing/gallery-young-athletes.jpeg",
    alt: "Young Cata Club athlete returning a serve during a match",
    caption: "Nuestras futuras promesas",
  },
  {
    src: "/landing/gallery-competition.jpeg",
    alt: "Cata Club athletes at the South American U11-U13 Table Tennis Championship in Asunción, Paraguay",
    caption: "Competencia internacional de tenis de mesa",
  },
  {
    src: "/landing/gallery-achievement.jpeg",
    alt: "Cata Club athletes celebrating a podium achievement",
    caption: "Los frutos del esfuerzo",
  },
];

function Stars(): React.ReactElement {
  return (
    <span className="landing-stars" aria-hidden="true">
      {[0, 1, 2].map((star): React.ReactElement => <Star key={star} fill="currentColor" />)}
    </span>
  );
}

function SectionHeader({ eyebrow, title, dark = false }: SectionHeaderProps): React.ReactElement {
  return (
    <header className={`landing-section-header${dark ? " on-dark" : ""}`}>
      <span className="landing-eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <span className="landing-separator" aria-hidden="true"><i /></span>
    </header>
  );
}

function Navbar(): React.ReactElement {
  return (
    <nav className="landing-navbar" aria-label="Navegación principal">
      <a className="landing-logo" href="#inicio" aria-label="Cata Club, inicio">
        <Image src="/landing/cata-club-logo.jpeg" alt="" width={62} height={62} priority />
        <span className="landing-display"><small>TENIS DE MESA</small>Cata Club</span>
      </a>
      <div className="landing-nav-links">
        <a className="active" href="#inicio" aria-current="page">Inicio</a>
        <a href="#nosotros">Nosotros</a>
        <a href="#galeria">Galería</a>
        <a href="#contacto">Soporte</a>
      </div>
      <Link className="landing-button landing-nav-cta" href="/login">
        ENTRAR <ArrowRight aria-hidden="true" />
      </Link>
    </nav>
  );
}

function Hero(): React.ReactElement {
  return (
    <header className="landing-hero" id="inicio" data-motion-section data-testid="motion-section">
      <span className="landing-halftone" aria-hidden="true" />
      <span className="landing-ribbon landing-ribbon-top" aria-hidden="true" />
      <div className="landing-hero-copy">
        <span className="landing-hero-brand"><b>Tenis de Mesa</b> · Cata Club</span>
        <h1 className="landing-display" aria-label="Cata Club — Formando campeones para la vida">FORMANDO <span>CAMPEONES</span> PARA LA VIDA</h1>
        <p>Únete a nuestro club, donde la técnica y el carácter forjan en cada punto.</p>
        <div className="landing-hero-actions">
          <Link className="landing-button" href="/login" aria-label="ENTRAR — Iniciar sesión">ENTRAR <ArrowRight aria-hidden="true" /></Link>
          <a className="landing-button landing-button-outline" href="#nosotros">Conoce el club</a>
        </div>
        <div className="landing-hero-note"><Stars /><span>Club deportivo formativo · Fundado en 2013</span></div>
      </div>
      <div className="landing-hero-animation" data-hero-parallax>
        <div className="landing-hero-screen">
          <Image
            className="landing-hero-photo"
            src="/landing/hero-photo.jpeg"
            alt="Entrenadores, deportistas y familias de Cata Club celebrando juntos"
            fill
            priority
            sizes="(max-width: 768px) 90vw, 620px"
          />
        </div>
      </div>
    </header>
  );
}

function Stats(): React.ReactElement {
  return (
    <section className="landing-stats" aria-label="Datos del club" data-motion-section data-testid="motion-section">
      {landingConfig.stats.map((stat): React.ReactElement => (
        <div className="landing-stat" key={stat.label} data-reveal>
          <strong
            className="landing-display"
            data-counter={stat.numericValue}
            data-prefix={stat.prefix ?? ""}
          >
            {stat.value}
          </strong>
          <span>{stat.label}</span>
        </div>
      ))}
    </section>
  );
}

function MissionVision(): React.ReactElement {
  return (
    <section className="landing-section" id="nosotros" data-motion-section data-testid="motion-section">
      <SectionHeader eyebrow="Quiénes somos" title="Misión y Visión" />
      <div className="landing-card-row">
        <article className="landing-card" data-reveal>
          <div className="landing-card-title"><span><Target aria-hidden="true" /></span><h3>Nuestra Misión</h3></div>
          <hr />
          <p>Promover el tenis de mesa mediante formación deportiva de calidad, fomentando el desarrollo integral de niños, jóvenes y adultos con valores, disciplina y excelencia competitiva.</p>
        </article>
        <article className="landing-card" data-reveal>
          <div className="landing-card-title"><span><Eye aria-hidden="true" /></span><h3>Nuestra Visión</h3></div>
          <hr />
          <p>Ser un club líder y referente provincial y nacional, preparando deportistas altamente competitivos que integren de manera permanente las selecciones del país.</p>
        </article>
      </div>
    </section>
  );
}

function ValueCard({ title, children }: ValueCardProps): React.ReactElement {
  return (
    <article className="landing-card landing-value" data-reveal>
      <div className="landing-card-title"><span><Trophy aria-hidden="true" /></span><h3>{title}</h3></div>
      <hr />
      <p>{children}</p>
    </article>
  );
}

function Values(): React.ReactElement {
  return (
    <section className="landing-section landing-values" data-motion-section data-testid="motion-section">
      <SectionHeader eyebrow="Lo que nos mueve" title="Nuestros Valores" />
      <div className="landing-value-row">
        <ValueCard title="Respeto">Honramos a rivales, compañeros y entrenadores en cada encuentro.</ValueCard>
        <ValueCard title="Disciplina">El progreso nace de la constancia y el entrenamiento diario.</ValueCard>
        <ValueCard title="Esfuerzo">Cada punto se gana con entrega y dedicación total.</ValueCard>
        <ValueCard title="Compañerismo">Crecemos como una familia, celebrando juntos cada logro.</ValueCard>
      </div>
    </section>
  );
}

function Motto(): React.ReactElement {
  return (
    <section className="landing-section landing-motto" aria-label="Lema del club" data-motion-section data-testid="motion-section">
      <span className="landing-halftone" aria-hidden="true" />
      <span className="landing-paddle" aria-hidden="true"><i /></span>
      <blockquote>“Formando <span>campeones</span> para la vida”</blockquote>
      <p>Cada entrenamiento es una oportunidad para superarte.</p>
      <Stars />
    </section>
  );
}

function Gallery(): React.ReactElement {
  return (
    <section className="landing-section landing-gallery" id="galeria" data-motion-section data-testid="motion-section">
      <SectionHeader eyebrow="Nuestra academia" title="Galería" />
      <div className="landing-gallery-row">
        {GALLERY_ITEMS.map((item): React.ReactElement => (
          <figure key={item.src} data-reveal>
            <Image src={item.src} alt={item.alt} width={400} height={280} sizes="(max-width: 768px) 100vw, 33vw" priority />
            <figcaption>{item.caption}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function ScheduleCard({ category, audience, hours, days }: ScheduleCardProps): React.ReactElement {
  return (
    <article className="landing-schedule-card" data-reveal>
      <h3>{category}</h3><span>{audience}</span><strong>{hours}</strong><b>{days}</b>
    </article>
  );
}

function Schedule(): React.ReactElement {
  return (
    <section className="landing-section landing-schedule" id="horarios" data-motion-section data-testid="motion-section">
      <SectionHeader eyebrow="Entrenamientos" title="Horarios" />
      <div className="landing-schedule-row">
        {landingConfig.schedules.map((schedule): React.ReactElement => <ScheduleCard key={schedule.category} {...schedule} />)}
      </div>
    </section>
  );
}

function Location(): React.ReactElement {
  const { contact } = landingConfig;
  return (
    <section className="landing-section landing-location" id="contacto" data-motion-section data-testid="motion-section">
      <SectionHeader eyebrow="Visítanos" title="Ubicación" />
      <div className="landing-location-row">
        <LandingMap />
        <aside className="landing-contact" data-reveal>
          <h3>Información de contacto</h3>
          <p><MapPin aria-hidden="true" /><span>Av. Manuel Agustín Aguirre, Barrio Perpetuo Socorro, Loja, Ecuador — junto al Coliseo Ciudad de Loja</span></p>
          <p><Phone className="landing-icon-whatsapp" aria-hidden="true" /><strong>Contactos</strong><span>{contact.whatsapp.join(" · ")}</span></p>
          <p><Facebook className="landing-icon-facebook" aria-hidden="true" /><strong>Facebook</strong><a href={contact.facebook} target="_blank" rel="noreferrer">Cata Club Loja</a></p>
          <p><Instagram className="landing-icon-instagram" aria-hidden="true" /><strong>Instagram</strong><a href={contact.instagram} target="_blank" rel="noreferrer">@cataclub_tenis_de_mesa</a></p>
          <p><CalendarDays aria-hidden="true" /><strong>Horario</strong><span>{contact.hours}</span></p>
          <a className="landing-button" href="https://www.openstreetmap.org/?mlat=-4.0056095&mlon=-79.2046238#map=18/-4.0056095/-79.2046238" target="_blank" rel="noreferrer">
            <Navigation aria-hidden="true" /> Cómo llegar
          </a>
        </aside>
      </div>
    </section>
  );
}

function Footer(): React.ReactElement {
  return (
    <footer className="landing-footer" data-motion-section data-testid="motion-section">
      <span className="landing-halftone" aria-hidden="true" />
      <div className="landing-footer-top">
        <div className="landing-footer-brand">
          <div><span><Image src="/landing/cata-club-logo.jpeg" alt="" width={58} height={58} /></span><b className="landing-display"><small>TENIS DE MESA</small>Cata Club</b></div>
          <p>Formando campeones de tenis de mesa en Loja desde 2013.</p><Stars />
        </div>
        <nav aria-label="Servicios"><h2>Servicios</h2><a href="#horarios">Entrenamientos</a><a href="#horarios">Horarios</a><a href="#horarios">Categorías</a><a href="#horarios">Alto rendimiento</a></nav>
        <nav aria-label="Nosotros"><h2>Nosotros</h2><a href="#nosotros">Misión y Visión</a><a href="#nosotros">Valores</a><a href="#galeria">Galería</a><a href="#contacto">Ubicación</a></nav>
      </div>
      <div className="landing-footer-bottom">© 2026 Cata Club · Tenis de Mesa. Todos los derechos reservados.</div>
    </footer>
  );
}

export default function LandingPage(): React.ReactElement {
  return (
    <div className="landing-page">
      <LandingMotion />
      <Navbar /><Hero /><Stats /><MissionVision /><Values /><Motto /><Gallery /><Schedule /><Location /><Footer />
    </div>
  );
}
