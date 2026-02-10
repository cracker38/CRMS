import React, { useState, useEffect } from 'react';

const Typewriter = ({ text, speed = 100, className = '', delay = 0, loop = true, loopDelay = 2000 }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (delay > 0 && !isStarted) {
      const delayTimer = setTimeout(() => {
        setIsStarted(true);
      }, delay);
      return () => clearTimeout(delayTimer);
    } else if (delay === 0) {
      setIsStarted(true);
    }
  }, [delay, isStarted]);

  useEffect(() => {
    if (!isStarted) {
      return;
    }

    if (!isDeleting && currentIndex >= text.length) {
      if (loop) {
        const pauseTimer = setTimeout(() => {
          setIsDeleting(true);
        }, loopDelay);
        return () => clearTimeout(pauseTimer);
      }
      return;
    }

    if (isDeleting && currentIndex <= 0) {
      setIsDeleting(false);
      setDisplayedText('');
      setCurrentIndex(0);
      return;
    }

    const timer = setTimeout(() => {
      if (isDeleting) {
        setDisplayedText(prev => prev.slice(0, -1));
        setCurrentIndex(prev => prev - 1);
      } else {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }
    }, isDeleting ? speed / 2 : speed);

    return () => clearTimeout(timer);
  }, [currentIndex, text, speed, isStarted, isDeleting, loop, loopDelay]);

  return (
    <span className={className}>
      {displayedText}
      <span className="typewriter-cursor">|</span>
    </span>
  );
};

export default Typewriter;

