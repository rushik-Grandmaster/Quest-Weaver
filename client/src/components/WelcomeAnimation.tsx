import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export function WelcomeAnimation() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShow(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: show ? 1 : 0 }}
      transition={{ duration: 0.6 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 pointer-events-none"
    >
      <div className="text-center space-y-4">
        {/* Main Title */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <h1 className="text-5xl md:text-7xl font-display font-bold text-white drop-shadow-lg">
            hajimeruka
          </h1>
        </motion.div>

        {/* Subtitle */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <p className="text-3xl md:text-5xl font-bold text-primary drop-shadow-lg">
            Grandmaster
          </p>
        </motion.div>

        {/* Glowing underline */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="h-1 w-32 mx-auto bg-gradient-to-r from-primary via-purple-500 to-primary rounded-full blur-sm"
        />
      </div>
    </motion.div>
  );
}
