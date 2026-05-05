import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';
import { Scene6 } from './video_scenes/Scene6';
import lanternImg from '@assets/favicon.webp';

export const SCENE_DURATIONS: Record<string, number> = {
  open: 6000,
  forge: 8000,
  vault: 7000,
  discover: 7000,
  craft: 8000,
  close: 9000,
};

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  open: Scene1,
  forge: Scene2,
  vault: Scene3,
  discover: Scene4,
  craft: Scene5,
  close: Scene6,
};

const lanternPos = [
  { x: '50vw', y: '50vh', scale: 1.5, opacity: 0.8 },
  { x: '10vw', y: '15vh', scale: 0.8, opacity: 0.6 },
  { x: '85vw', y: '80vh', scale: 0.6, opacity: 0.5 },
  { x: '80vw', y: '15vh', scale: 1.0, opacity: 0.7 },
  { x: '15vw', y: '80vh', scale: 0.8, opacity: 0.6 },
  { x: '50vw', y: '40vh', scale: 2.0, opacity: 1.0 },
];

const bgColors = [
  '#0f172a',
  '#0a1120',
  '#F6E3BA',
  '#0f172a',
  '#f1f7f4',
  '#0f172a',
];

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentScene, currentSceneKey } = useVideoPlayer({ durations, loop });

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '') as keyof typeof SCENE_DURATIONS;
  const sceneIndex = Object.keys(SCENE_DURATIONS).indexOf(baseSceneKey);
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  const lp = lanternPos[sceneIndex] ?? lanternPos[0];
  const bg = bgColors[sceneIndex] ?? bgColors[0];

  return (
    <motion.div
      className="w-full h-screen overflow-hidden relative"
      animate={{ backgroundColor: bg }}
      transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Background ambient glow */}
      <div className="absolute inset-0 z-0">
        <motion.div
          className="absolute w-[80vw] h-[80vw] rounded-full blur-[80px]"
          animate={{
            x: ['-20%', '10%', '-10%', '30%', '-20%', '10%'][currentScene] ?? '-20%',
            y: ['-20%', '30%', '50%', '-10%', '60%', '-20%'][currentScene] ?? '-20%',
            background: [
              'radial-gradient(circle, rgba(139, 92, 246, 0.15), transparent 70%)',
              'radial-gradient(circle, rgba(16, 185, 129, 0.2), transparent 70%)',
              'radial-gradient(circle, rgba(109, 84, 47, 0.1), transparent 70%)',
              'radial-gradient(circle, rgba(139, 92, 246, 0.2), transparent 70%)',
              'radial-gradient(circle, rgba(16, 185, 129, 0.15), transparent 70%)',
              'radial-gradient(circle, rgba(139, 92, 246, 0.2), transparent 70%)',
            ][currentScene] ?? 'radial-gradient(circle, rgba(139, 92, 246, 0.15), transparent 70%)',
          }}
          transition={{ duration: 3, ease: 'easeInOut' }}
        />
      </div>

      {/* Persistent floating lantern */}
      <motion.div
        className="absolute z-40 w-32 h-32 -ml-16 -mt-16 pointer-events-none"
        animate={{
          x: lp.x,
          y: lp.y,
          scale: lp.scale,
          opacity: lp.opacity,
        }}
        transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.img
          src={lanternImg}
          alt="Lantern"
          className="w-full h-full object-contain"
          animate={{ y: [0, -15, 0], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute inset-0 rounded-full blur-xl -z-10"
          style={{ background: 'rgba(246, 227, 186, 0.4)' }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>

      {/* Scenes */}
      <AnimatePresence mode="popLayout">
        {SceneComponent && <SceneComponent key={currentSceneKey} />}
      </AnimatePresence>
    </motion.div>
  );
}
