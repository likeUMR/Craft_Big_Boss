import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import { soundManager } from '../utils/SoundManager';
import { Mentor } from '../types';
import { 
  BASE_WIDTH, 
  BASE_HEIGHT, 
  FRUIT_CONFIG_BASE 
} from '../constants/gameConfig';
import { getRandomMentors } from '../utils/gameHelpers';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { Overlays } from './Game/Overlays';
import { GameUI } from './Game/GameUI';


const Game: React.FC = () => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const gameOverRef = useRef(false);
  const [gameWin, setGameWin] = useState(false);
  const gameWinRef = useRef(false);

  useEffect(() => {
    gameOverRef.current = gameOver;
  }, [gameOver]);

  useEffect(() => {
    gameWinRef.current = gameWin;
  }, [gameWin]);
  const [showTutorial, setShowTutorial] = useState(true);
  const [userId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('user_id');
  });
  const { existingRecord, reportWin } = useLeaderboard(userId);
  const maxFruitLevelRef = useRef(0);

  useEffect(() => {
    if (gameWin) {
      reportWin(score);
    }
  }, [gameWin, score, reportWin]);

  const [assignedMentors, setAssignedMentors] = useState<Mentor[]>(getRandomMentors);

  const shuffleMentors = () => {
    setAssignedMentors(getRandomMentors());
  };

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
  const burnProgress = useRef(0);
  const lastBurnUpdateTime = useRef<number | null>(null);
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
  }, [assignedMentors]);

  useEffect(() => {
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
      gravity: { y: 1.05 * scale }, // 将重力减慢至 70% (1.5 * 0.7 = 1.05)
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
        pixelRatio: window.devicePixelRatio || 1
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
      
      // 设置图像平滑
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      
      // 1. 失败检测与烧条逻辑更新
      if (!gameOverRef.current && !gameWinRef.current) {
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

        const deltaTime = lastBurnUpdateTime.current ? now - lastBurnUpdateTime.current : 0;
        lastBurnUpdateTime.current = now;

        if (anyFruitAbove) {
          if (!isBurning.current) {
            isBurning.current = true;
            // 危险警告音
            soundManager.startWarning();
          }
          burnProgress.current = Math.min(1, burnProgress.current + deltaTime / BURN_DURATION);
          
          if (burnProgress.current >= 1) {
            setGameOver(true);
            soundManager.playGameOver();
            if (runnerRef.current) {
              Matter.Runner.stop(runnerRef.current);
            }
          }
        } else {
          // 没有触碰时，按烧条速度恢复
          if (burnProgress.current > 0) {
            burnProgress.current = Math.max(0, burnProgress.current - deltaTime / BURN_DURATION);
          }
          
          if (isBurning.current && burnProgress.current === 0) {
            isBurning.current = false;
            soundManager.stopWarning();
          }
        }
      } else {
        // 游戏结束或胜利时，停止更新时间，防止 deltaTime 错误
        lastBurnUpdateTime.current = null;
        if (gameWinRef.current && isBurning.current) {
          isBurning.current = false;
          soundManager.stopWarning();
        }
      }

      const currentProgress = gameOverRef.current ? 1 : burnProgress.current;

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
      if (currentFruitBody.current && !isDropping.current && !gameOverRef.current) {
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
            if (bodyA.isStatic || bodyB.isStatic || gameOverRef.current || gameWinRef.current) return;
            
            // 防止同一物体在同一帧参与多次合成
            if ((bodyA as any).isMerging || (bodyB as any).isMerging) return;
            
            processedCollisions.add(collisionId);
            (bodyA as any).isMerging = true;
            (bodyB as any).isMerging = true;
            
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

            console.log(`合成成功: 等级 ${level} -> ${newLevel} (${fruitConfig[newLevel].name})`);

            // 胜利判定：合成出最后一个等级
            if (newLevel === fruitConfig.length - 1) {
              console.log('触发胜利判定！当前 newLevel:', newLevel, '最高等级:', fruitConfig.length - 1);
              setGameWin(true);
              soundManager.playWin();
              soundManager.stopWarning();
              if (runnerRef.current) {
                Matter.Runner.stop(runnerRef.current);
              }
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
      soundManager.playWin();
      soundManager.stopWarning();
      if (runnerRef.current) {
        Matter.Runner.stop(runnerRef.current);
      }
      console.log("测试命令：游戏胜利！");
    };

    (window as any).spawnTestMentors = () => {
      if (!engineRef.current) return;
      if (gameWinRef.current || gameOverRef.current) return;
      const x = dimensions.width / 2;
      const y = dimensions.height / 2;
      const level = fruitConfig.length - 2; // 次高级 (等级 8)
      const fruit1 = createFruit(x - 50, y, level);
      const fruit2 = createFruit(x + 50, y, level);
      Matter.World.add(engineRef.current.world, [fruit1, fruit2]);
      console.log(`已生成两个${fruitConfig[level].name}，快去合成刘铁岩吧！`);
    };

    (window as any).spawnLiuTieyan = () => {
      if (!engineRef.current) return;
      const x = dimensions.width / 2;
      const y = dimensions.height / 2;
      const level = fruitConfig.length - 1; // 最高级 (等级 9)
      const fruit = createFruit(x, y, level);
      Matter.World.add(engineRef.current.world, fruit);
      console.log(`已生成${fruitConfig[level].name}！`);
      // 直接生成刘铁岩也应该触发胜利
      setGameWin(true);
      soundManager.playWin();
      soundManager.stopWarning();
      if (runnerRef.current) {
        Matter.Runner.stop(runnerRef.current);
      }
    };

    (window as any).loseGame = () => {
      setGameOver(true);
      soundManager.playGameOver();
      soundManager.stopWarning();
      if (runnerRef.current) {
        Matter.Runner.stop(runnerRef.current);
      }
      console.log("测试命令：游戏失败！");
    };

    (window as any).spawnMassiveMentors = (count = 20) => {
      if (!engineRef.current) return;
      if (gameWinRef.current || gameOverRef.current) return;
      const { width, height } = dimensions;
      const fruits = [];
      for (let i = 0; i < count; i++) {
        const x = Math.random() * (width - 100) + 50;
        const y = Math.random() * (height - 200) + 100;
        const level = Math.floor(Math.random() * 5); // 随机生成前5级的导师
        fruits.push(createFruit(x, y, level));
      }
      Matter.World.add(engineRef.current.world, fruits);
      console.log(`测试命令：已随机生成 ${count} 个导师！`);
    };

    // 运行
    const runner = Matter.Runner.create();
    runnerRef.current = runner;
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
      <GameUI
        score={score}
        dimensions={dimensions}
        assignedMentors={assignedMentors}
        fruitConfig={fruitConfig}
        currentFruitIndex={currentFruitIndex}
        fruitImages={fruitImages}
      />

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
      
      <Overlays
        showTutorial={showTutorial}
        setShowTutorial={setShowTutorial}
        gameWin={gameWin}
        gameOver={gameOver}
        score={score}
        existingRecord={existingRecord}
        userId={userId}
        dimensions={dimensions}
        assignedMentors={assignedMentors}
        fruitConfig={fruitConfig}
        shuffleMentors={shuffleMentors}
      />
    </div>
  );
};

export default Game;
