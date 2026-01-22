import React, { useState } from 'react';
import { soundManager } from '../../utils/SoundManager';
import { Mentor } from '../../types';

interface OverlaysProps {
  showTutorial: boolean;
  setShowTutorial: (show: boolean) => void;
  gameWin: boolean;
  gameOver: boolean;
  score: number;
  existingRecord: { rank: number; created_at: string } | null;
  userId: string | null;
  dimensions: { scale: number; width: number; height: number };
  assignedMentors: Mentor[];
  fruitConfig: any[];
  shuffleMentors: () => void;
}

export const Overlays: React.FC<OverlaysProps> = ({
  showTutorial,
  setShowTutorial,
  gameWin,
  gameOver,
  score,
  existingRecord,
  userId,
  dimensions,
  assignedMentors,
  fruitConfig,
  shuffleMentors
}) => {
  const [isWinClosed, setIsWinClosed] = useState(false);
  const [isFailClosed, setIsFailClosed] = useState(false);

  return (
    <>
      {showTutorial && (
        <div className="tutorial-overlay" style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 200,
          padding: `${20 * dimensions.scale}px`,
          boxSizing: 'border-box'
        }}>
          <h2 style={{ color: '#ffcc00', marginBottom: `${20 * dimensions.scale}px`, fontSize: `${24 * dimensions.scale}px` }}>终极目标：合成刘铁岩</h2>
          
          {existingRecord ? (
            <div style={{
              background: 'rgba(255, 204, 0, 0.15)',
              border: '1px solid #ffcc00',
              borderRadius: `${10 * dimensions.scale}px`,
              padding: `${15 * dimensions.scale}px`,
              marginBottom: `${20 * dimensions.scale}px`,
              textAlign: 'center',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              <div style={{ color: '#ffcc00', fontWeight: 'bold', fontSize: `${18 * dimensions.scale}px`, marginBottom: '5px' }}>
                🎉 您已通关！
              </div>
              <div style={{ fontSize: `${14 * dimensions.scale}px`, color: '#eee' }}>
                通关时间：{new Date(new Date(existingRecord.created_at).getTime() + 8 * 60 * 60 * 1000).toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')}<br/>
                当前排名：第 {existingRecord.rank} 名
              </div>
              <div style={{ fontSize: `${12 * dimensions.scale}px`, color: '#aaa', marginTop: '8px' }}>
                * 重复游玩不会刷新最早通关时间记录
              </div>
            </div>
          ) : userId ? (
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: `${10 * dimensions.scale}px`,
              padding: `${15 * dimensions.scale}px`,
              marginBottom: `${20 * dimensions.scale}px`,
              textAlign: 'center',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              <div style={{ color: '#fff', fontWeight: 'bold', fontSize: `${18 * dimensions.scale}px`, marginBottom: '5px' }}>
                已登录 (ID: {userId.length > 8 ? userId.substring(0, 8) + '...' : userId})
              </div>
              <div style={{ fontSize: `${14 * dimensions.scale}px`, color: '#eee' }}>
                您还没有通关记录<br/>
                通关后将自动录入排行榜
              </div>
            </div>
          ) : null}

          <ul style={{ textAlign: 'left', lineHeight: '1.8', fontSize: `${16 * dimensions.scale}px` }}>
            <li>左右滑动：选择位置</li>
            <li>抬起手指：让其掉落</li>
            <li>相同导师碰撞：合成更多导师</li>
            <li>注意：不要超过红色虚线！</li>
          </ul>
          <h3 style={{ fontSize: `${18 * dimensions.scale}px`, marginTop: `${10 * dimensions.scale}px` }}>合成顺序</h3>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            justifyContent: 'center', 
            gap: `${10 * dimensions.scale}px`,
            background: 'rgba(255,255,255,0.1)',
            padding: `${15 * dimensions.scale}px`,
            borderRadius: `${10 * dimensions.scale}px`,
            marginBottom: `${15 * dimensions.scale}px`,
            maxWidth: '100%'
          }}>
            {assignedMentors.map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: `${4 * dimensions.scale}px` }}>
                <div style={{
                  width: `${32 * dimensions.scale}px`,
                  height: `${32 * dimensions.scale}px`,
                  borderRadius: '50%',
                  backgroundColor: fruitConfig[i].color,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  color: 'white',
                  fontSize: `${18 * dimensions.scale}px`,
                  fontWeight: 'bold',
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                }}>
                  {m.name.substring(0, 1)}
                </div>
                {i < assignedMentors.length - 1 && <span style={{ opacity: 0.5, fontSize: `${16 * dimensions.scale}px` }}>→</span>}
              </div>
            ))}
          </div>

          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            width: '100%', 
            marginBottom: `${10 * dimensions.scale}px` 
          }}>
            <h3 style={{ fontSize: `${18 * dimensions.scale}px`, margin: 0 }}>导师介绍</h3>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                shuffleMentors();
              }}
              style={{
                padding: `${5 * dimensions.scale}px ${12 * dimensions.scale}px`,
                fontSize: `${14 * dimensions.scale}px`,
                backgroundColor: 'rgba(255, 204, 0, 0.2)',
                border: '1px solid #ffcc00',
                borderRadius: `${15 * dimensions.scale}px`,
                color: '#ffcc00',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 204, 0, 0.3)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 204, 0, 0.2)')}
            >
              🔄 换一换
            </button>
          </div>
          <div style={{
            width: '100%',
            maxHeight: `${300 * dimensions.scale}px`,
            overflowY: 'auto',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: `${10 * dimensions.scale}px`,
            padding: `${10 * dimensions.scale}px`,
            marginBottom: `${20 * dimensions.scale}px`,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: `${8 * dimensions.scale}px`
          }}>
            {assignedMentors.map((m, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: `${6 * dimensions.scale}px ${10 * dimensions.scale}px`,
                background: 'rgba(255,255,255,0.05)',
                borderRadius: `${8 * dimensions.scale}px`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: `${8 * dimensions.scale}px`, overflow: 'hidden' }}>
                  <img 
                    src={m.avatar} 
                    alt={m.name} 
                    style={{ 
                      width: `${32 * dimensions.scale}px`, 
                      height: `${32 * dimensions.scale}px`, 
                      borderRadius: '50%', 
                      objectFit: 'cover',
                      flexShrink: 0,
                      border: `2px solid ${fruitConfig[i].color}`
                    }} 
                  />
                  <span style={{ 
                    fontSize: `${14 * dimensions.scale}px`, 
                    fontWeight: 'bold',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>{m.name}</span>
                </div>
                {m.homepage && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(m.homepage, '_blank');
                    }}
                    style={{
                      padding: `${3 * dimensions.scale}px ${8 * dimensions.scale}px`,
                      fontSize: `${10 * dimensions.scale}px`,
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: `${12 * dimensions.scale}px`,
                      color: 'white',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    主页
                  </button>
                )}
              </div>
            ))}
          </div>
          <button 
            onClick={() => {
              setShowTutorial(false);
              soundManager.resume();
            }}
            style={{
              padding: `${12 * dimensions.scale}px ${40 * dimensions.scale}px`,
              fontSize: `${18 * dimensions.scale}px`,
              backgroundColor: '#ffcc00',
              border: 'none',
              borderRadius: `${25 * dimensions.scale}px`,
              color: '#333',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            开始游戏
          </button>
        </div>
      )}

      {gameWin && !isWinClosed && (
        <div className="game-over game-win" style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${dimensions.scale})`,
          background: 'rgba(255, 215, 0, 0.95)',
          color: '#333',
          padding: '30px',
          borderRadius: '20px',
          textAlign: 'center',
          zIndex: 100,
          boxShadow: '0 0 40px rgba(0,0,0,0.6)',
          border: '5px solid white',
          width: '80%',
          maxWidth: '300px',
          animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsWinClosed(true);
            }}
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.1)',
              border: 'none',
              color: '#8b4513',
              fontSize: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold'
            }}
          >
            ×
          </button>
          <h2 style={{ fontSize: '36px', margin: '0 0 10px 0', color: '#8b4513', fontWeight: '900' }}>挑战成功！</h2>
          <div style={{ fontSize: '80px', margin: '10px 0' }}>🏆</div>
          <p style={{ fontSize: '20px', fontWeight: 'bold', margin: '10px 0' }}>你成功合成了刘铁岩！</p>
          <div style={{ 
            fontSize: '24px', 
            margin: '20px 0', 
            padding: '10px', 
            background: 'rgba(255,255,255,0.3)',
            borderRadius: '10px'
          }}>
            最终得分: <span style={{ color: '#d2691e', fontWeight: '900' }}>{score}</span>
          </div>
          <button 
            onClick={() => {
              soundManager.resume();
              window.location.reload();
            }}
            style={{
              marginTop: '10px',
              padding: '12px 40px',
              fontSize: '20px',
              backgroundColor: '#8b4513',
              color: 'white',
              border: 'none',
              borderRadius: '30px',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 6px 0 #5d2e0d'
            }}
          >
            再来一局
          </button>
        </div>
      )}

      {gameOver && !isFailClosed && (
        <div className="game-over game-fail" style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${dimensions.scale})`,
          background: 'rgba(220, 53, 69, 0.95)',
          color: 'white',
          padding: '30px',
          borderRadius: '20px',
          textAlign: 'center',
          zIndex: 100,
          boxShadow: '0 0 40px rgba(0,0,0,0.6)',
          border: '5px solid white',
          width: '80%',
          maxWidth: '300px',
          animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsFailClosed(true);
            }}
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              fontSize: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold'
            }}
          >
            ×
          </button>
          <h2 style={{ fontSize: '36px', margin: '0 0 10px 0', fontWeight: '900' }}>挑战失败</h2>
          <div style={{ fontSize: '80px', margin: '10px 0' }}>❌</div>
          <p style={{ fontSize: '20px', fontWeight: 'bold', margin: '10px 0' }}>导师堆积过高啦！</p>
          <div style={{ 
            fontSize: '24px', 
            margin: '20px 0', 
            padding: '10px', 
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '10px'
          }}>
            最终得分: <span style={{ fontWeight: '900' }}>{score}</span>
          </div>
          <button 
            onClick={() => {
              soundManager.resume();
              window.location.reload();
            }}
            style={{
              marginTop: '10px',
              padding: '12px 40px',
              fontSize: '20px',
              backgroundColor: 'white',
              color: '#dc3545',
              border: 'none',
              borderRadius: '30px',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 6px 0 #a71d2a'
            }}
          >
            重整旗鼓
          </button>
        </div>
      )}
    </>
  );
};
