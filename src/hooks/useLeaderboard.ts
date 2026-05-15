import { useState, useEffect, useRef } from 'react';

type AdmissionGameStatus = {
  cleared: boolean;
  cleared_at: string | null;
  rank: number | null;
};

type AdmissionRegisterClearResponse = {
  game_status?: AdmissionGameStatus;
};

type ExistingRecord = {
  rank: number | null;
  cleared_at: string;
};

const API_BASE = 'https://leaderboard.liruochen.cn';
const CAMPAIGN_ID = 'zgca-admission';
const GAME_ID = 'craft-big-boss';

async function postJson<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const useLeaderboard = (userId: string | null) => {
  const [existingRecord, setExistingRecord] = useState<ExistingRecord | null>(null);
  const reportedRef = useRef(false);

  useEffect(() => {
    reportedRef.current = false;
    setExistingRecord(null);

    const checkRecord = async () => {
      if (!userId) return;
      try {
        const data = await postJson<AdmissionGameStatus>('/api/admission/game_status', {
          campaign_id: CAMPAIGN_ID,
          game_id: GAME_ID,
          user_id: userId
        });

        if (data?.cleared && data.cleared_at) {
          setExistingRecord({
            rank: data.rank,
            cleared_at: data.cleared_at
          });
          reportedRef.current = true;
        }
      } catch (error) {
        console.error('Failed to check existing record:', error);
      }
    };

    checkRecord();
  }, [userId]);

  const reportWin = async (finalScore: number) => {
    if (!userId || reportedRef.current) return;

    try {
      const result = await postJson<AdmissionRegisterClearResponse>('/api/admission/register_clear', {
        campaign_id: CAMPAIGN_ID,
        game_id: GAME_ID,
        user_id: userId
      });

      if (result.game_status?.cleared && result.game_status.cleared_at) {
        setExistingRecord({
          rank: result.game_status.rank,
          cleared_at: result.game_status.cleared_at
        });
        reportedRef.current = true;
      }

      // 保留原有分数榜能力，通关登记改走 admission API。
      await postJson('/api/upload', {
        game_id: GAME_ID,
        user_id: userId,
        score: finalScore,
        field_id: 'main'
      });

      console.log('Successfully reported win info for user:', userId);
    } catch (error) {
      console.error('Failed to report win info:', error);
    }
  };

  return { existingRecord, reportWin };
};
