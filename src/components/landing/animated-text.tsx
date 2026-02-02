'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface AnimatedTextProps {
  text: string;
  className?: string;
  delay?: number;
  staggerDelay?: number;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
}

export function AnimatedText({
  text,
  className = '',
  delay = 0,
  staggerDelay = 0.03,
  as: Component = 'span',
}: AnimatedTextProps) {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const words = container.querySelectorAll('.word');

    gsap.set(words, { opacity: 0, y: 20 });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            gsap.to(words, {
              opacity: 1,
              y: 0,
              duration: 0.6,
              stagger: staggerDelay,
              delay,
              ease: 'power3.out',
            });
            observer.unobserve(container);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(container);

    return () => observer.disconnect();
  }, [delay, staggerDelay]);

  const words = text.split(' ').map((word, index) => (
    <span key={index} className="word inline-block">
      {word}&nbsp;
    </span>
  ));

  return (
    <Component ref={containerRef as React.RefObject<HTMLHeadingElement>} className={className}>
      {words}
    </Component>
  );
}
