'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { HelpCircle } from 'lucide-react';

export default function TourGuide() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const startTour = (force = false) => {
    // Determine context based on pathname
    let steps: any[] = [];
    let tourKey = 'tour_seen_home';

    if (pathname === '/') {
      tourKey = 'tour_seen_home';
      steps = [
        { popover: { title: '¡Bienvenido a E-Football!', description: 'La plataforma definitiva para gestionar tus torneos e-sports.', side: "bottom", align: 'start' }},
        { element: '.tour-search', popover: { title: 'Buscador', description: 'Aquí puedes encontrar rápidamente tus torneos por nombre. Solo presiona Enter.', side: "bottom", align: 'start' }},
        { element: '.tour-create-btn', popover: { title: 'Crear Torneo', description: '¡Empieza la magia! Haz clic aquí para configurar un nuevo torneo desde cero.', side: "bottom", align: 'start' }}
      ];
    } else if (pathname === '/crear') {
      tourKey = 'tour_seen_create';
      steps = [
        { popover: { title: 'Configuración', description: 'Aquí darás vida a tu torneo. Sigue los pasos.', side: "top", align: 'start' }},
        { element: '#name', popover: { title: 'Nombre', description: 'Ponle un nombre épico a tu competición.', side: "top", align: 'start' }},
        { element: '.tour-format', popover: { title: 'Formatos Profesionales', description: 'Puedes elegir formatos básicos como Liga, o avanzados como Doble Eliminación o Sistema Suizo.', side: "top", align: 'start' }},
        { element: '.tour-teams', popover: { title: 'Equipos', description: 'Escribe el nombre y presiona Enter o Coma para agregar cada equipo como una etiqueta.', side: "top", align: 'start' }},
        { element: '#pin', popover: { title: 'PIN de Seguridad', description: '¡Súper importante! Memoriza este PIN, lo necesitarás luego para ingresar los resultados de los partidos.', side: "top", align: 'start' }},
        { element: 'button[type="submit"]', popover: { title: '¡A jugar!', description: 'Cuando todo esté listo, genera el calendario automáticamente.', side: "top", align: 'start' }}
      ];
    } else if (pathname.startsWith('/t/')) {
      tourKey = 'tour_seen_tournament';
      steps = [
        { popover: { title: 'Panel del Torneo', description: 'Este es el centro de control de tu torneo.', side: "bottom", align: 'start' }},
        { element: '.tour-admin-btn', popover: { title: 'Modo Administrador', description: 'Haz clic aquí e ingresa tu PIN para desbloquear la edición de resultados.', side: "bottom", align: 'start' }},
        { element: '.tour-standings', popover: { title: 'Tablas y Llaves', description: 'Aquí verás las posiciones o los cuadros eliminatorios, que se actualizarán en tiempo real.', side: "bottom", align: 'start' }},
        { element: '.tour-matches', popover: { title: 'Partidos', description: 'Una vez desbloqueado, haz clic en cualquier partido o en el ícono de guardar para ingresar el marcador.', side: "top", align: 'start' }},
        { element: '.tour-share', popover: { title: 'Compartir', description: 'Envía este enlace a los participantes para que sigan el torneo en vivo (ellos no podrán editar sin el PIN).', side: "bottom", align: 'start' }}
      ];
    }

    if (steps.length === 0) return;

    if (!force) {
      const hasSeen = localStorage.getItem(tourKey);
      if (hasSeen === 'true') return;
    }

    const d = driver({
      showProgress: true,
      animate: true,
      nextBtnText: 'Siguiente',
      prevBtnText: 'Anterior',
      doneBtnText: 'Entendido',
      popoverClass: 'driver-theme-neon', // Custom styling class
      steps: steps,
      onDestroyStarted: () => {
        if (!d.hasNextStep() || confirm("¿Seguro que quieres saltar el tutorial?")) {
          d.destroy();
          localStorage.setItem(tourKey, 'true');
        }
      },
    });

    // Small delay to ensure elements are rendered
    setTimeout(() => {
      d.drive();
    }, 500);
  };

  useEffect(() => {
    if (mounted) {
      startTour(false);
    }
  }, [pathname, mounted]);

  if (!mounted) return null;

  return (
    <button 
      onClick={() => startTour(true)}
      className="flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-neon transition-colors"
      title="Ver Tutorial de esta página"
    >
      <HelpCircle className="w-5 h-5" />
      <span className="hidden sm:inline">Tutorial</span>
    </button>
  );
}
