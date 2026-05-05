import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocalStore } from '../hooks/useLocalStore';

const BOARD_ICONS = ['✨', '🔥', '💎', '🌙', '⚡', '🌿', '🏮', '🎭', '🌊', '🌸'];

interface Props {
  promptId: string;
  onClose: () => void;
}

export function SaveToBoardModal({ promptId, onClose }: Props) {
  const { boards, createBoard, addToBoard, removeFromBoard } = useLocalStore();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('✨');
  const [flash, setFlash] = useState<string | null>(null);

  function handleCreate() {
    if (!newName.trim()) return;
    createBoard(newName.trim(), newIcon);
    setNewName('');
    setCreating(false);
  }

  function toggleBoard(boardId: string, inBoard: boolean) {
    if (inBoard) {
      removeFromBoard(boardId, promptId);
    } else {
      addToBoard(boardId, promptId);
      setFlash(boardId);
      setTimeout(() => setFlash(null), 1200);
    }
  }

  return (
    <motion.div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}>

      <motion.div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: '#080f1e', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 0 60px rgba(0,0,0,0.6)' }}
        initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.85rem', color: '#f8fafc', letterSpacing: '0.12em' }}>
            Save to Board
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="p-4 space-y-2" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
          {boards.length === 0 && !creating && (
            <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: '16px 0' }}>
              No boards yet. Create one below.
            </p>
          )}

          {boards.map(board => {
            const inBoard = board.promptIds.includes(promptId);
            const isFlash = flash === board.id;
            return (
              <motion.button key={board.id}
                onClick={() => toggleBoard(board.id, inBoard)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left"
                style={{
                  background: inBoard ? 'rgba(16,185,129,0.08)' : (isFlash ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.03)'),
                  border: `1px solid ${inBoard ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.07)'}`,
                  cursor: 'pointer',
                }}
                whileHover={{ background: inBoard ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.06)' }}
                whileTap={{ scale: 0.98 }}>
                <span style={{ fontSize: '1rem' }}>{board.icon}</span>
                <div className="flex-1 min-w-0">
                  <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.78rem', color: inBoard ? '#10b981' : 'rgba(248,250,252,0.7)' }}>
                    {board.name}
                  </div>
                  <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.58rem', color: 'rgba(255,255,255,0.25)' }}>
                    {board.promptIds.length} item{board.promptIds.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: inBoard ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${inBoard ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)'}` }}>
                  {inBoard && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Create new board */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: 16 }}>
          <AnimatePresence mode="wait">
            {creating ? (
              <motion.div key="form" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <div className="mb-3">
                  <div className="flex gap-1.5 flex-wrap mb-3">
                    {BOARD_ICONS.map(ic => (
                      <button key={ic} onClick={() => setNewIcon(ic)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                        style={{ background: newIcon === ic ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${newIcon === ic ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.08)'}`, cursor: 'pointer' }}>
                        {ic}
                      </button>
                    ))}
                  </div>
                  <input
                    autoFocus
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false); }}
                    placeholder="Board name…"
                    className="w-full px-3 py-2 rounded-xl outline-none"
                    style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.78rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc' }}
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setCreating(false)}
                    className="flex-1 py-2 rounded-xl"
                    style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button onClick={handleCreate}
                    className="flex-1 py-2 rounded-xl"
                    style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', color: '#10b981', cursor: 'pointer' }}>
                    Create
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.button key="btn" onClick={() => setCreating(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.12)', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}
                whileHover={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.2)' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                New Board
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
