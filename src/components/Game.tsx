import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import { soundManager } from '../utils/SoundManager';
import mentorsData from '../data/mentors.json';

interface Mentor {
  name: string;
  avatar: string;
  homepage: string;
}

const BASE_WIDTH = 500;
const BASE_HEIGHT = 800;
const TOTAL_LEVELS = 10; // 最高级别设置

// 生成基于 HSL 的蓝色到红色的渐变色（色相渐变）
const getGradientColor = (level: number, total: number) => {
  // 蓝色 HSL 约为 240，红色 HSL 约为 0
  // 为了路过中间的颜色（青、绿、黄、橙），我们从 240 减小到 0
  const ratio = level / (total - 1);
  const hue = Math.round(240 * (1 - ratio));
  return `hsl(${hue}, 70%, 50%)`;
};

const FRUIT_CONFIG_BASE = Array.from({ length: TOTAL_LEVELS }, (_, i) => ({
  name: i === TOTAL_LEVELS - 1 ? '刘院长' : `导师_${i}`,
  radius: 15 + i * 15, // 这里的半径逻辑可以稍微优化，原来的逻辑是：15, 25, 35, 45, 55, 70, 85, 100, 120, 150, 180
  color: getGradientColor(i, TOTAL_LEVELS),
  score: Math.pow(2, i),
  emoji: '🎓'
}));

// 稍微调整半径，使其更接近原有的比例
const RADIUS_MAPPING = [15, 25, 35, 45, 55, 70, 85, 100, 120, 150, 180, 210, 240];
FRUIT_CONFIG_BASE.forEach((config, i) => {
  config.radius = RADIUS_MAPPING[i] || (180 + (i - 10) * 30);
});

const Game: React.FC = () => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameWin, setGameWin] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const maxFruitLevelRef = useRef(0);

  // 导师分配逻辑
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [assignedMentors, setAssignedMentors] = useState<Mentor[]>(() => {
    const allMentors: Mentor[] = mentorsData as Mentor[];
    const liuTieyan = allMentors.find(m => m.name === '刘铁岩');
    const others = allMentors.filter(m => m.name !== '刘铁岩');
    
    // 随机选择 (TOTAL_LEVELS - 1) 个导师
    const shuffled = [...others].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, TOTAL_LEVELS - 1);
    
    // 刘铁岩固定在最后（最高级）
    if (liuTieyan) {
      selected.push(liuTieyan);
    } else {
      selected.push({ name: '刘铁岩', avatar: 'tie_yan.png', homepage: '' });
    }
    return selected;
  });

  const [currentFruitIndex, setCurrentFruitIndex] = useState(() => Math.floor(Math.random() * 3));
  const currentFruitIndexRef = useRef(currentFruitIndex);
  const [nextFruitIndex, setNextFruitIndex] = useState(() => Math.floor(Math.random() * 3));
  const nextFruitIndexRef = useRef(nextFruitIndex);
  
  // 确保 Refs 在状态改变时同步（主要用于初始化后的同步）
  useEffect(() => {
    currentFruitIndexRef.current = currentFruitIndex;
    nextFruitIndexRef.current = nextFruitIndex;
  }, [currentFruitIndex, nextFruitIndex]);
  
  // 动态计算缩放比例
  const [dimensions, setDimensions] = useState(() => {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // 强制左右顶满（移动端或窄屏）
    let gameWidth = screenWidth;
    
    // 如果是桌面端（极宽屏），可以适当限制宽度以防过于夸张
    if (screenWidth > 600) {
      gameWidth = Math.min(500, screenWidth * 0.9);
    }

    // 根据宽度计算高度，严格保持 500:800 比例
    const gameHeight = gameWidth * (BASE_HEIGHT / BASE_WIDTH);
    const scale = gameWidth / BASE_WIDTH;
    
    return { width: gameWidth, height: gameHeight, scale, screenWidth, screenHeight };
  });

  // 根据缩放比例动态生成配置
  const fruitConfig = FRUIT_CONFIG_BASE.map(f => ({
    ...f,
    radius: f.radius * dimensions.scale
  }));

  const fruitImages = useRef<Map<string, HTMLImageElement>>(new Map());
  const isDropping = useRef(false);
  const currentFruitBody = useRef<Matter.Body | null>(null);
  const gameOverLineY = 150 * dimensions.scale; // 稍微调高一点死亡线
  
  // 烧条机制相关的状态
  const isBurning = useRef(false);
  const burningStartTime = useRef<number | null>(null);
  const BURN_DURATION = 3000; // 3秒烧完

  useEffect(() => {
    // 预加载所有导师头像
    assignedMentors.forEach((mentor, index) => {
      const img = new Image();
      img.src = mentor.avatar;
      img.onload = () => {
        fruitImages.current.set(`mentor_${index}`, img);
      };
      // 处理加载失败的情况，可以使用默认图片或文字占位
      img.onerror = () => {
        console.error(`Failed to load avatar for ${mentor.name}: ${mentor.avatar}`);
      };
    });

    const handleResize = () => {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      
      // 彻底去掉 600px 限制，始终让宽度顶满屏幕
      let gameWidth = screenWidth;
      
      // 只有在屏幕宽度超过 800px 时才限制一个最大宽度，否则在手机上永远是 100%
      if (screenWidth > 800) {
        gameWidth = Math.min(600, screenWidth * 0.95);
      }

      const gameHeight = gameWidth * (BASE_HEIGHT / BASE_WIDTH);
      const scale = gameWidth / BASE_WIDTH;
      setDimensions({ width: gameWidth, height: gameHeight, scale, screenWidth, screenHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const { width, height, scale } = dimensions;
    
    // 初始化引擎
    const engine = Matter.Engine.create({
      gravity: { y: 1.5 * scale }, // 重力也随比例缩放
      positionIterations: 10,
      velocityIterations: 10
    });
    engineRef.current = engine;

    // 初始化渲染器
    const render = Matter.Render.create({
      element: sceneRef.current!,
      engine: engine,
      options: {
        width: width,
        height: height,
        wireframes: false,
        background: '#ffe8ad',
      },
    });
    renderRef.current = render;

    // 添加边界
    const ground = Matter.Bodies.rectangle(width / 2, height + 30, width, 60, { isStatic: true, friction: 0.5 });
    const leftWall = Matter.Bodies.rectangle(-30, height / 2, 60, height, { isStatic: true, friction: 0.5 });
    const rightWall = Matter.Bodies.rectangle(width + 30, height / 2, 60, height, { isStatic: true, friction: 0.5 });
    
    Matter.World.add(engine.world, [ground, leftWall, rightWall]);

    // 绘制逻辑
    Matter.Events.on(render, 'afterRender', () => {
      const context = render.context;
      const now = Date.now();
      
      // 1. 失败检测与烧条逻辑更新
      let currentProgress = 0;
      if (!gameOver && !gameWin) {
        const bodies = Matter.Composite.allBodies(engine.world);
        let anyFruitAbove = false;

        for (const body of bodies) {
          if (!body.isStatic && body.label.startsWith('fruit_')) {
            const index = parseInt(body.label.split('_')[1]);
            const radius = fruitConfig[index].radius;
            // 判定水果顶部超过死亡线，且速度较慢（堆积判定）
            if (body.position.y - radius < gameOverLineY && body.velocity.y < 0.2) {
              anyFruitAbove = true;
              break;
            }
          }
        }

        if (anyFruitAbove) {
          if (!isBurning.current) {
            isBurning.current = true;
            burningStartTime.current = now;
            // 危险警告音
            soundManager.startWarning();
          }
          const elapsed = now - burningStartTime.current!;
          currentProgress = Math.min(1, elapsed / BURN_DURATION);
          
          if (currentProgress >= 1) {
            setGameOver(true);
            soundManager.playGameOver();
          }
        } else {
          if (isBurning.current) {
            isBurning.current = false;
            burningStartTime.current = null;
            soundManager.stopWarning();
          }
        }
      }

      // 2. 绘制死亡线（带烧条效果）
      const burnWidth = width * currentProgress;
      const remainingWidth = width - burnWidth;

      // 绘制已烧尽部分（灰色）
      if (burnWidth > 0) {
        context.beginPath();
        context.moveTo(width, gameOverLineY);
        context.lineTo(width - burnWidth, gameOverLineY);
        context.strokeStyle = 'rgba(128, 128, 128, 0.5)';
        context.setLineDash([5, 5]);
        context.lineWidth = 2;
        context.stroke();
      }

      // 绘制未烧尽部分（红色）
      if (remainingWidth > 0) {
        context.beginPath();
        context.moveTo(0, gameOverLineY);
        context.lineTo(remainingWidth, gameOverLineY);
        context.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        context.setLineDash([5, 5]);
        context.lineWidth = 3;
        context.stroke();

        // 如果正在燃烧，在交界处增加鞭炮/火花效果
        if (isBurning.current && currentProgress > 0 && currentProgress < 1) {
          const sparkX = remainingWidth;
          const sparkY = gameOverLineY;
          
          // 绘制一个明亮的火花点
          context.beginPath();
          context.arc(sparkX, sparkY, 4 * scale, 0, Math.PI * 2);
          context.fillStyle = '#ffcc00';
          context.fill();
          
          // 随机散发几个小火星
          for (let i = 0; i < 3; i++) {
            const offsetX = (Math.random() - 0.5) * 10 * scale;
            const offsetY = (Math.random() - 0.5) * 10 * scale;
            context.beginPath();
            context.arc(sparkX + offsetX, sparkY + offsetY, 1.5 * scale, 0, Math.PI * 2);
            context.fillStyle = Math.random() > 0.5 ? '#ff4500' : '#ffff00';
            context.fill();
          }
        }
      }
      context.setLineDash([]);

      // 绘制表情
      const bodies = Matter.Composite.allBodies(engine.world);
      bodies.forEach(body => {
        if (body.label.startsWith('fruit_')) {
          const index = parseInt(body.label.split('_')[1]);
          const config = fruitConfig[index];
          const { x, y } = body.position;
          const angle = body.angle;

          context.save();
          context.translate(x, y);
          context.rotate(angle);
          context.textAlign = 'center';
          context.textBaseline = 'middle';

          // 绘制背景圆圈
          context.beginPath();
          context.arc(0, 0, config.radius, 0, Math.PI * 2);
          context.fillStyle = config.color;
          context.fill();
          
          // 绘制导师头像
          const img = fruitImages.current.get(`mentor_${index}`);
          if (img && img.complete) {
            context.save();
            context.beginPath();
            context.arc(0, 0, config.radius * 0.9, 0, Math.PI * 2); // 稍微缩小一点，露出边框
            context.clip();
            context.drawImage(img, -config.radius * 0.9, -config.radius * 0.9, config.radius * 1.8, config.radius * 1.8);
            context.restore();
          } else {
            // 如果图片没加载完，显示名字的前两个字或者emoji
            context.fillStyle = 'white';
            context.font = `bold ${config.radius * 0.6}px Arial`;
            context.fillText(assignedMentors[index].name.substring(0, 2), 0, 0);
          }
          
          context.restore();
        }
      });

      // 绘制预览虚线（瞄准线）
      if (currentFruitBody.current && !isDropping.current && !gameOver) {
        const { x } = currentFruitBody.current.position;
        context.beginPath();
        context.moveTo(x, 100 * scale);
        context.lineTo(x, height);
        context.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        context.setLineDash([5 * scale, 10 * scale]);
        context.stroke();
        context.setLineDash([]);
      }
    });

    // 碰撞检测逻辑
    const processedCollisions = new Set<string>();

    Matter.Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;
        
        // 生成唯一的碰撞对 ID，确保同一对只处理一次
        const collisionId = [bodyA.id, bodyB.id].sort().join('-');
        if (processedCollisions.has(collisionId)) return;

        if (bodyA.label === bodyB.label && bodyA.label.startsWith('fruit_')) {
          const level = parseInt(bodyA.label.split('_')[1]);
          if (level < fruitConfig.length - 1) {
            if (bodyA.isStatic || bodyB.isStatic || gameOver || gameWin) return;
            
            processedCollisions.add(collisionId);
            
            // 播放合成音效
            soundManager.playMerge(level);
            
            const x = (bodyA.position.x + bodyB.position.x) / 2;
            const y = (bodyA.position.y + bodyB.position.y) / 2;
            
            Matter.World.remove(engine.world, [bodyA, bodyB]);
            
            const newLevel = level + 1;
            const newFruit = createFruit(x, y, newLevel);
            Matter.World.add(engine.world, newFruit);
            
            // 更新最高等级记录
            maxFruitLevelRef.current = Math.max(maxFruitLevelRef.current, newLevel);
            
            createParticles(x, y, fruitConfig[level].color);
            setScore((prev) => prev + fruitConfig[newLevel].score);

            // 胜利判定：合成出最后一个等级
            if (newLevel === fruitConfig.length - 1) {
              setGameWin(true);
              soundManager.playWin();
            }

            // 清理已处理的碰撞对 ID
            setTimeout(() => processedCollisions.delete(collisionId), 100);
          }
        }
      });
    });

    // 暴露测试命令到全局
    (window as any).winGame = () => {
      setGameWin(true);
      console.log("测试命令：游戏胜利！");
    };

    // 运行
    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);
    Matter.Render.run(render);

    return () => {
      Matter.Render.stop(render);
      Matter.Engine.clear(engine);
      render.canvas.remove();
      soundManager.stopWarning();
    };
  }, [dimensions.width, dimensions.height, dimensions.scale]); // 增加 scale 依赖

  const createParticles = (x: number, y: number, color: string) => {
    if (!engineRef.current) return;
    const { scale } = dimensions;
    const particles: Matter.Body[] = [];
    for (let i = 0; i < 8; i++) {
      const particle = Matter.Bodies.circle(x, y, 5 * scale, {
        render: { fillStyle: color },
        frictionAir: 0.05,
        collisionFilter: { group: -1 }
      });
      Matter.Body.setVelocity(particle, {
        x: (Math.random() - 0.5) * 10 * scale,
        y: (Math.random() - 0.5) * 10 * scale
      });
      particles.push(particle);
      setTimeout(() => {
        if (engineRef.current) {
          Matter.World.remove(engineRef.current.world, particle);
        }
      }, 1000);
    }
    Matter.World.add(engineRef.current.world, particles);
  };

  const createFruit = (x: number, y: number, index: number, isStatic = false) => {
    const config = fruitConfig[index];
    return Matter.Bodies.circle(x, y, config.radius, {
      label: `fruit_${index}`,
      restitution: 0.3,    // 保持一定的弹性
      friction: 0.2,       // 增加摩擦力，减少滑动导致的重叠
      frictionStatic: 0.5,    // 增加静态摩擦力，让堆叠更稳
      frictionAir: 0.015,  // 稍微增加空气阻力，让水果更快静止，减少震荡侵入
      slop: 0.01 * dimensions.scale,          // 减小允许的重叠值，使水果看起来更硬
      isStatic: isStatic,
      render: { fillStyle: config.color },
    });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isDropping.current || gameOver || gameWin || showTutorial) return;
    
    const rect = sceneRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    let x = e.clientX - rect.left;
    const radius = fruitConfig[currentFruitIndexRef.current].radius;
    x = Math.max(radius, Math.min(dimensions.width - radius, x));
    
    // 按下时立即生成水果
    if (!currentFruitBody.current) {
      const fruit = createFruit(x, 100 * dimensions.scale, currentFruitIndexRef.current, true);
      currentFruitBody.current = fruit;
      Matter.World.add(engineRef.current!.world, fruit);
      soundManager.playCreate();

      // 💡 关键修复：水果一旦生成在手里，立即更新“下一个”的索引，让 UI 提前预示
      const nextIndex = nextFruitIndexRef.current;
      setCurrentFruitIndex(nextIndex);
      currentFruitIndexRef.current = nextIndex;
      
      const maxRandomLevel = Math.max(3, maxFruitLevelRef.current - 2);
      const newNextIndex = Math.floor(Math.random() * maxRandomLevel);
      setNextFruitIndex(newNextIndex);
      nextFruitIndexRef.current = newNextIndex;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDropping.current || gameOver || gameWin || showTutorial) return;
    const rect = sceneRef.current?.getBoundingClientRect();
    if (!rect) return;
    let x = e.clientX - rect.left;
    const radius = fruitConfig[currentFruitIndexRef.current].radius;
    x = Math.max(radius, Math.min(dimensions.width - radius, x));
    if (!currentFruitBody.current) {
      const fruit = createFruit(x, 100 * dimensions.scale, currentFruitIndexRef.current, true);
      currentFruitBody.current = fruit;
      Matter.World.add(engineRef.current!.world, fruit);
      soundManager.playCreate();

      // 💡 同样在 Move 中触发生成时也需要更新预览
      const nextIndex = nextFruitIndexRef.current;
      setCurrentFruitIndex(nextIndex);
      currentFruitIndexRef.current = nextIndex;
      
      const maxRandomLevel = Math.max(3, maxFruitLevelRef.current - 2);
      const newNextIndex = Math.floor(Math.random() * maxRandomLevel);
      setNextFruitIndex(newNextIndex);
      nextFruitIndexRef.current = newNextIndex;
    } else {
      Matter.Body.setPosition(currentFruitBody.current, { x, y: 100 * dimensions.scale });
    }
  };

  const handlePointerUp = () => {
    if (isDropping.current || gameOver || gameWin || showTutorial || !currentFruitBody.current) return;
    
    // 立即释放当前水果
    const droppedFruit = currentFruitBody.current;
    Matter.Body.setStatic(droppedFruit, false);
    currentFruitBody.current = null;
    
    // 播放掉落音效
    soundManager.playDrop();
    
    // 💡 移除这里的更新逻辑，因为已经在 Down/Move 生成时更新过了
    
    // 如果需要极致手感，这里甚至不需要设置 isDropping 状态
    // 但为了防止极短时间内的重复触发（例如震动），可以保留一个极短的保护期
    isDropping.current = true;
    setTimeout(() => {
      isDropping.current = false;
    }, 100); // 缩短到 100ms，几乎无感
  };

  return (
    <div 
      className="main-wrapper"
      style={{
        width: '100%',
        height: '100vh',
        position: 'relative',
        overflow: 'hidden',
        background: '#ffe8ad',
        display: 'flex',
        flexDirection: 'column',
        margin: 0,
        padding: 0
      }}
    >
      <style>
        {`
          body { 
            background-color: #ffe8ad; 
            margin: 0;
            padding: 0;
            overflow: hidden;
            touch-action: none;
            width: 100%;
            height: 100%;
          } 
          @keyframes popIn {
            0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
            100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          }
          .score-board, .next-fruit, .tutorial-overlay, .game-over {
            transform-origin: center;
          }
          * {
            user-select: none;
            -webkit-user-select: none;
            -webkit-touch-callout: none;
            -webkit-tap-highlight-color: transparent;
          }
          canvas {
            display: block;
            width: 100% !important;
            height: 100% !important;
          }
        `}
      </style>

      {/* 顶部 UI 区域 */}
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
            backgroundColor: fruitConfig[currentFruitIndex].color,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
            margin: '0 auto',
            border: `3px solid white`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            {fruitImages.current.get(`mentor_${currentFruitIndex}`) ? (
              <img 
                src={assignedMentors[currentFruitIndex].avatar} 
                alt="next" 
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ fontSize: `${32 * dimensions.scale}px`, color: 'white', fontWeight: 'bold' }}>
                {assignedMentors[currentFruitIndex].name.substring(0, 1)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 底部游戏区域 */}
      <div 
        className="game-container" 
        style={{ 
          position: 'absolute', 
          bottom: 0,
          left: 0,
          width: '100%', 
          height: dimensions.height,
          overflow: 'hidden',
          background: '#ffe8ad',
          // 只有在非顶满宽度时才居中（桌面端）
          display: 'flex',
          justifyContent: 'center'
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div ref={sceneRef} style={{ width: dimensions.width, height: dimensions.height, position: 'relative' }} />
      </div>
      
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
          <ul style={{ textAlign: 'left', lineHeight: '1.8', fontSize: `${16 * dimensions.scale}px` }}>
            <li>左右滑动：选择位置</li>
            <li>抬起手指：让其掉落</li>
            <li>相同导师碰撞：合成更高级导师</li>
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

          <h3 style={{ fontSize: `${18 * dimensions.scale}px`, marginBottom: `${10 * dimensions.scale}px` }}>导师介绍</h3>
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

      {gameWin && (
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

      {gameOver && (
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
    </div>
  );
};

export default Game;
