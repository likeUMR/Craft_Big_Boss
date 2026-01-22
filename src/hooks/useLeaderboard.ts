import { useState, useEffect, useRef } from 'react';

export const useLeaderboard = (userId: string | null) => {
  const [existingRecord, setExistingRecord] = useState<{ rank: number, created_at: string } | null>(null);
  const reportedRef = useRef(false);

  // 检查已有记录
  useEffect(() => {
    const checkRecord = async () => {
      if (!userId) return;
      try {
        const response = await fetch('https://leaderboard.liruochen.cn/api/player_score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            game_id: 'craft-big-boss',
            user_id: userId,
            field_id: 'clear_time'
          })
        });
        if (response.ok) {
          const data = await response.json();
          if (data && data.rank) {
            setExistingRecord({
              rank: data.rank,
              created_at: data.created_at
            });
            reportedRef.current = true; // 已经有记录了，标记为已汇报
          }
        }
      } catch (error) {
        console.error('Failed to check existing record:', error);
      }
    };
    checkRecord();
  }, [userId]);

  // 汇报通关信息
  const reportWin = async (finalScore: number) => {
    if (!userId || reportedRef.current) return;
    
    try {
      // 1. 汇报通关时间榜 (clear_time)
      await fetch('https://leaderboard.liruochen.cn/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: 'craft-big-boss',
          user_id: userId,
          score: 1,
          field_id: 'clear_time'
        })
      });

      // 2. 同时汇报分数榜 (main)
      await fetch('https://leaderboard.liruochen.cn/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: 'craft-big-boss',
          user_id: userId,
          score: finalScore,
          field_id: 'main'
        })
      });

      reportedRef.current = true;
      console.log('Successfully reported win info for user:', userId);
    } catch (error) {
      console.error('Failed to report win info:', error);
    }
  };

  return { existingRecord, reportWin };
};
