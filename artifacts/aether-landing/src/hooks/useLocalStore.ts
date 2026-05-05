import { useState, useCallback } from 'react';

export interface AetherComment {
  id: string;
  promptId: string;
  text: string;
  authorName: string;
  authorPicture?: string;
  createdAt: string;
}

export interface AetherNotification {
  id: string;
  type: 'follow' | 'reaction' | 'comment' | 'challenge' | 'streak' | 'milestone';
  message: string;
  read: boolean;
  time: string;
  link?: string;
}

export interface AetherBoard {
  id: string;
  name: string;
  icon: string;
  promptIds: string[];
  createdAt: string;
}

export interface RemixParent {
  parentId: string;
  parentPrompt: string;
  parentThumb: string | null;
  parentAuthor: string;
}

export interface CageMatchReplay {
  id: string;
  roomName: string;
  targetTheme: string;
  targetPrompt: string;
  targetImage: string | null;
  playerPrompt: string;
  playerModel: string;
  score: number;
  won: boolean;
  createdAt: string;
}

export interface CageQuest {
  id: string;
  label: string;
  reward: number;
  progress: number;
  goal: number;
  completed: boolean;
  icon: string;
}

function readSet(key: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(key) ?? '[]')); }
  catch { return new Set(); }
}
function writeSet(key: string, s: Set<string>) {
  localStorage.setItem(key, JSON.stringify([...s]));
}
function readRecord<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; }
  catch { return fallback; }
}

export function useLocalStore() {
  const [liked, setLiked] = useState<Set<string>>(() => readSet('aether_likes'));
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>(
    () => readRecord('aether_like_counts', {})
  );
  const [saved, setSaved] = useState<Set<string>>(() => readSet('aether_saved'));
  const [collections, setCollections] = useState<Record<string, string[]>>(
    () => readRecord('aether_collections', {})
  );
  const [credits, setCredits] = useState<number>(() => {
    const v = localStorage.getItem('aether_credits');
    return v ? parseInt(v, 10) : 100;
  });
  const [reactions, setReactions] = useState<Record<string, Record<string, number>>>(
    () => readRecord('aether_reactions', {})
  );
  const [myReactions, setMyReactions] = useState<Record<string, string>>(
    () => readRecord('aether_my_reactions', {})
  );
  const [comments, setComments] = useState<Record<string, AetherComment[]>>(
    () => readRecord('aether_comments', {})
  );
  const [following, setFollowing] = useState<Set<string>>(() => readSet('aether_following'));
  const [notifications, setNotifications] = useState<AetherNotification[]>(
    () => readRecord('aether_notifications', [])
  );
  const [streak, setStreak] = useState<{ count: number; lastDate: string | null }>(
    () => readRecord('aether_streak', { count: 0, lastDate: null })
  );
  const [ratings, setRatings] = useState<Record<string, { sum: number; count: number; mine: number }>>(
    () => readRecord('aether_ratings', {})
  );
  const [remixTree, setRemixTreeState] = useState<Record<string, RemixParent>>(
    () => readRecord('aether_remix_tree', {})
  );
  const [boards, setBoards] = useState<AetherBoard[]>(
    () => readRecord('aether_boards', [])
  );
  const [cageHistory, setCageHistory] = useState<CageMatchReplay[]>(
    () => readRecord('aether_cage_history', [])
  );
  const [cageQuests, setCageQuests] = useState<CageQuest[]>(() => {
    const existing = readRecord<CageQuest[]>('aether_cage_quests', []);
    return existing.length > 0 ? existing : [
      { id: 'play', label: 'Play 1 Cage Match', reward: 20, progress: 0, goal: 1, completed: false, icon: '⚔' },
      { id: 'win', label: 'Win a Cage Match', reward: 35, progress: 0, goal: 1, completed: false, icon: '🏆' },
      { id: 'watch', label: 'Watch 2 Live Matches', reward: 15, progress: 0, goal: 2, completed: false, icon: '👁' },
      { id: 'share', label: 'Share 1 Replay', reward: 10, progress: 0, goal: 1, completed: false, icon: '↗' },
    ];
  });

  /* ── Likes ── */
  const toggleLike = useCallback((id: string) => {
    setLiked(prev => {
      const next = new Set(prev);
      const wasLiked = next.has(id);
      wasLiked ? next.delete(id) : next.add(id);
      writeSet('aether_likes', next);
      setLikeCounts(counts => {
        const updated = { ...counts, [id]: (counts[id] ?? 0) + (wasLiked ? -1 : 1) };
        if (updated[id] < 0) updated[id] = 0;
        localStorage.setItem('aether_like_counts', JSON.stringify(updated));
        return updated;
      });
      return next;
    });
  }, []);

  const getLikes = useCallback((id: string, base = 0) => {
    return Math.max(0, base + (likeCounts[id] ?? 0));
  }, [likeCounts]);

  const isLiked = useCallback((id: string) => liked.has(id), [liked]);

  /* ── Saves ── */
  const toggleSave = useCallback((id: string) => {
    setSaved(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      writeSet('aether_saved', next);
      return next;
    });
  }, []);

  const isSaved = useCallback((id: string) => saved.has(id), [saved]);

  /* ── Collections (legacy) ── */
  const addToCollection = useCallback((name: string, promptId: string) => {
    setCollections(prev => {
      const updated = { ...prev, [name]: [...(prev[name] ?? []), promptId] };
      localStorage.setItem('aether_collections', JSON.stringify(updated));
      return updated;
    });
  }, []);

  /* ── Credits ── */
  const spendCredits = useCallback((amount: number) => {
    setCredits(prev => {
      const next = Math.max(0, prev - amount);
      localStorage.setItem('aether_credits', String(next));
      return next;
    });
  }, []);

  const earnCredits = useCallback((amount: number) => {
    setCredits(prev => {
      const next = prev + amount;
      localStorage.setItem('aether_credits', String(next));
      return next;
    });
  }, []);

  /* ── Reactions ── */
  const toggleReaction = useCallback((promptId: string, emoji: string) => {
    setMyReactions(prev => {
      const current = prev[promptId];
      const removing = current === emoji;
      const next = { ...prev };
      if (removing) delete next[promptId];
      else next[promptId] = emoji;
      localStorage.setItem('aether_my_reactions', JSON.stringify(next));
      setReactions(r => {
        const promptReactions = { ...(r[promptId] ?? {}) };
        if (current) {
          promptReactions[current] = Math.max(0, (promptReactions[current] ?? 1) - 1);
          if (promptReactions[current] === 0) delete promptReactions[current];
        }
        if (!removing) {
          promptReactions[emoji] = (promptReactions[emoji] ?? 0) + 1;
        }
        const updated = { ...r, [promptId]: promptReactions };
        localStorage.setItem('aether_reactions', JSON.stringify(updated));
        return updated;
      });
      return next;
    });
  }, []);

  const getReactions = useCallback((promptId: string) => reactions[promptId] ?? {}, [reactions]);
  const getMyReaction = useCallback((promptId: string) => myReactions[promptId] ?? null, [myReactions]);

  /* ── Comments ── */
  const addComment = useCallback((promptId: string, text: string, authorName: string, authorPicture?: string) => {
    const comment: AetherComment = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      promptId, text: text.trim(), authorName, authorPicture,
      createdAt: new Date().toISOString(),
    };
    setComments(prev => {
      const updated = { ...prev, [promptId]: [...(prev[promptId] ?? []), comment] };
      localStorage.setItem('aether_comments', JSON.stringify(updated));
      return updated;
    });
    return comment;
  }, []);

  const getComments = useCallback((promptId: string): AetherComment[] => comments[promptId] ?? [], [comments]);
  const getCommentCount = useCallback((promptId: string) => (comments[promptId] ?? []).length, [comments]);

  /* ── Following ── */
  const followUser = useCallback((userName: string) => {
    setFollowing(prev => { const next = new Set(prev); next.add(userName); writeSet('aether_following', next); return next; });
  }, []);
  const unfollowUser = useCallback((userName: string) => {
    setFollowing(prev => { const next = new Set(prev); next.delete(userName); writeSet('aether_following', next); return next; });
  }, []);
  const isFollowing = useCallback((userName: string) => following.has(userName), [following]);
  const getFollowing = useCallback(() => [...following], [following]);

  /* ── Notifications ── */
  const addNotification = useCallback((n: Omit<AetherNotification, 'id' | 'read' | 'time'>) => {
    const notif: AetherNotification = {
      ...n, id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      read: false, time: new Date().toISOString(),
    };
    setNotifications(prev => {
      const updated = [notif, ...prev].slice(0, 50);
      localStorage.setItem('aether_notifications', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      localStorage.setItem('aether_notifications', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    localStorage.setItem('aether_notifications', '[]');
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  /* ── Streak ── */
  const recordStreak = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    setStreak(prev => {
      if (prev.lastDate === today) return prev;
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const newCount = prev.lastDate === yesterday ? prev.count + 1 : 1;
      const next = { count: newCount, lastDate: today };
      localStorage.setItem('aether_streak', JSON.stringify(next));
      return next;
    });
  }, []);

  /* ── Ratings ── */
  const ratePrompt = useCallback((promptId: string, stars: number) => {
    setRatings(prev => {
      const existing = prev[promptId] ?? { sum: 0, count: 0, mine: 0 };
      const prevMine = existing.mine;
      const newSum = existing.sum - prevMine + stars;
      const newCount = prevMine > 0 ? existing.count : existing.count + 1;
      const updated = { ...prev, [promptId]: { sum: newSum, count: newCount, mine: stars } };
      localStorage.setItem('aether_ratings', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getRating = useCallback((promptId: string) => {
    const r = ratings[promptId];
    if (!r || r.count === 0) return null;
    return { avg: r.sum / r.count, count: r.count };
  }, [ratings]);

  const getMyRating = useCallback((promptId: string) => ratings[promptId]?.mine ?? 0, [ratings]);
  const getRatingsSortable = useCallback(() => ratings, [ratings]);

  /* ── Remix Tree ── */
  const setRemixParent = useCallback((childId: string, parent: RemixParent) => {
    setRemixTreeState(prev => {
      const updated = { ...prev, [childId]: parent };
      localStorage.setItem('aether_remix_tree', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getRemixParent = useCallback((childId: string): RemixParent | null => remixTree[childId] ?? null, [remixTree]);

  const getRemixAncestors = useCallback((childId: string): RemixParent[] => {
    const ancestors: RemixParent[] = [];
    let current = childId;
    for (let i = 0; i < 8; i++) {
      const parent = remixTree[current];
      if (!parent) break;
      ancestors.push(parent);
      current = parent.parentId;
    }
    return ancestors;
  }, [remixTree]);

  /* ── Boards ── */
  const createBoard = useCallback((name: string, icon = '✨') => {
    setBoards(prev => {
      const board: AetherBoard = {
        id: `board-${Date.now()}`, name, icon, promptIds: [],
        createdAt: new Date().toISOString(),
      };
      const updated = [...prev, board];
      localStorage.setItem('aether_boards', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const addToBoard = useCallback((boardId: string, promptId: string) => {
    setBoards(prev => {
      const updated = prev.map(b =>
        b.id === boardId && !b.promptIds.includes(promptId)
          ? { ...b, promptIds: [...b.promptIds, promptId] } : b
      );
      localStorage.setItem('aether_boards', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeFromBoard = useCallback((boardId: string, promptId: string) => {
    setBoards(prev => {
      const updated = prev.map(b =>
        b.id === boardId ? { ...b, promptIds: b.promptIds.filter(id => id !== promptId) } : b
      );
      localStorage.setItem('aether_boards', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deleteBoard = useCallback((boardId: string) => {
    setBoards(prev => {
      const updated = prev.filter(b => b.id !== boardId);
      localStorage.setItem('aether_boards', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const addCageReplay = useCallback((replay: Omit<CageMatchReplay, 'id' | 'createdAt'>) => {
    setCageHistory(prev => {
      const updated = [{
        ...replay,
        id: `cage-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        createdAt: new Date().toISOString(),
      }, ...prev].slice(0, 20);
      localStorage.setItem('aether_cage_history', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateCageQuest = useCallback((id: string, delta = 1) => {
    setCageQuests(prev => {
      const updated = prev.map(q => {
        if (q.id !== id || q.completed) return q;
        const progress = Math.min(q.goal, q.progress + delta);
        return { ...q, progress, completed: progress >= q.goal };
      });
      localStorage.setItem('aether_cage_quests', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return {
    toggleLike, getLikes, isLiked,
    toggleSave, isSaved, saved,
    collections, addToCollection,
    credits, spendCredits, earnCredits,
    toggleReaction, getReactions, getMyReaction,
    addComment, getComments, getCommentCount,
    followUser, unfollowUser, isFollowing, getFollowing,
    notifications, addNotification, markAllRead, clearNotifications, unreadCount,
    streak, recordStreak,
    ratePrompt, getRating, getMyRating, getRatingsSortable,
    setRemixParent, getRemixParent, getRemixAncestors,
    boards, createBoard, addToBoard, removeFromBoard, deleteBoard,
    cageHistory, addCageReplay, cageQuests, updateCageQuest,
  };
}
