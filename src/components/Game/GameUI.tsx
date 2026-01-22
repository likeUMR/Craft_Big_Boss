import React from 'react';
import { Mentor } from '../../types';

interface GameUIProps {
  score: number;
  dimensions: { scale: number; width: number; height: number };
  assignedMentors: Mentor[];
  fruitConfig: any[];
  currentFruitIndex: number;
  fruitImages: React.MutableRefObject<Map<string, HTMLImageElement>>;
}

export const GameUI: React.FC<GameUIProps> = ({
  score,
  dimensions,
  assignedMentors,
  fruitConfig,
  currentFruitIndex,
  fruitImages
}) => {
  return (
    <div className="top-ui" style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      padding: `${15 * dimensions.scale}px`,
      boxSizing: 'border-box',
      zIndex: 10,
      pointerEvents: 'none'
    }}>
      {/* 预渲染隐藏图片以确保浏览器缓存 */}
      <div style={{ display: 'none' }}>
        {assignedMentors.map((m, i) => (
          <img key={i} src={m.avatar} alt="preload" />
        ))}
      </div>
      <div className="score-board" style={{
        position: 'absolute',
        top: `${20 * dimensions.scale}px`,
        left: `${20 * dimensions.scale}px`,
        color: '#333',
        fontSize: `${36 * dimensions.scale}px`,
        fontWeight: 'bold',
        textShadow: '1px 1px 2px white'
      }}>
        得分: {score}
        {/* 常驻显示合成顺序 */}
        <div className="sequence-display" style={{
          marginTop: `${15 * dimensions.scale}px`,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.75)',
          padding: `${10 * dimensions.scale}px ${15 * dimensions.scale}px`,
          borderRadius: `${15 * dimensions.scale}px`,
          fontSize: `${58 * dimensions.scale}px`,
          width: `${310 * dimensions.scale}px`,
          gap: `${8 * dimensions.scale}px`,
          border: '2px solid rgba(255,255,255,0.5)',
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
        }}>
          {assignedMentors.map((m, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: `${3 * dimensions.scale}px` }}>
              <div style={{
                width: `${37 * dimensions.scale}px`,
                height: `${37 * dimensions.scale}px`,
                borderRadius: '50%',
                backgroundColor: fruitConfig[i].color,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                color: 'white',
                fontSize: `${24 * dimensions.scale}px`,
                fontWeight: 'bold',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)'
              }}>
                {m.name.substring(0, 1)}
              </div>
              {i < assignedMentors.length - 1 && <span style={{ opacity: 0.3, fontSize: `${14 * dimensions.scale}px` }}>→</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="next-fruit" style={{
        position: 'absolute',
        top: `${20 * dimensions.scale}px`,
        right: `${20 * dimensions.scale}px`,
        textAlign: 'center',
        background: 'rgba(255, 255, 255, 0.75)',
        padding: `${15 * dimensions.scale}px`,
        borderRadius: `${20 * dimensions.scale}px`,
        border: '2px solid rgba(255,255,255,0.5)',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        minWidth: `${80 * dimensions.scale}px`
      }}>
        <div style={{ fontSize: `${24 * dimensions.scale}px`, color: '#666', marginBottom: `${8 * dimensions.scale}px`, fontWeight: 'bold' }}>下一个</div>
        <div style={{ 
          width: `${80 * dimensions.scale}px`, 
          height: `${80 * dimensions.scale}px`, 
          borderRadius: '50%', 
          backgroundColor: fruitConfig[currentFruitIndex]?.color || '#ccc',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
          margin: '0 auto',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          position: 'relative'
        }}>
          {assignedMentors.map((m, i) => (
            <img 
              key={i}
              src={m.avatar} 
              alt={`next-${i}`} 
              style={{ 
                width: '90%', 
                height: '90%', 
                borderRadius: '50%', 
                objectFit: 'cover',
                display: i === currentFruitIndex ? 'block' : 'none'
              }}
            />
          ))}
          {!fruitImages.current.has(`mentor_${currentFruitIndex}`) && (
            <span style={{ 
              fontSize: `${32 * dimensions.scale}px`, 
              color: 'white', 
              fontWeight: 'bold',
              display: 'block' 
            }}>
              {assignedMentors[currentFruitIndex]?.name.substring(0, 1)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
