import { useEffect, useRef, useState } from "react";
import { animate } from "motion/react";

export default function AnimatedNumber({ value, format = (v) => Math.round(v).toLocaleString() }) {
  const [display, setDisplay] = useState(0);
  const prevValue = useRef(0);

  useEffect(() => {
    const numericValue = Number(value) || 0;
    const controls = animate(prevValue.current, numericValue, {
      duration: 0.6,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(v),
    });
    prevValue.current = numericValue;
    return () => controls.stop();
  }, [value]);

  return format(display);
}
