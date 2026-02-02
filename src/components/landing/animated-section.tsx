'use client';

import { useEffect, useRef, ReactNode } from 'react';
import gsap from 'gsap';

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  duration?: number;
}

export function AnimatedSection({
  children,
  className = '',
  delay = 0,
  direction = 'up',
  duration = 0.8,
}: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const getInitialPosition = () => {
      switch (direction) {
        case 'up':
          return { y: 60, x: 0 };
        case 'down':
          return { y: -60, x: 0 };
        case 'left':
          return { y: 0, x: 60 };
        case 'right':
          return { y: 0, x: -60 };
        case 'none':
          return { y: 0, x: 0 };
      }
    };

    const { x, y } = getInitialPosition();

    gsap.set(element, { opacity: 0, y, x });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            gsap.to(element, {
              opacity: 1,
              y: 0,
              x: 0,
              duration,
              delay,
              ease: 'power3.out',
            });
            observer.unobserve(element);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [delay, direction, duration]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
