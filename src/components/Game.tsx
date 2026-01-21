import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';

const BASE_WIDTH = 500;
const BASE_HEIGHT = 800; // 设定一个基准高度比例

const FRUIT_CONFIG_BASE = [
  { name: '山竹', radius: 15, color: '#ff0000', score: 1, emoji: '🫐' },
  { name: '樱桃', radius: 25, color: '#ff4d4d', score: 2, emoji: '🍒' },
  { name: '橘子', radius: 35, color: '#ffa500', score: 4, emoji: '🍊' },
  { name: '柠檬', radius: 45, color: '#ffff00', score: 8, emoji: '🍋' },
  { name: '猕猴桃', radius: 55, color: '#00ff00', score: 16, emoji: '🥝' },
  { name: '西红柿', radius: 70, color: '#ff6347', score: 32, emoji: '🍎' },
  { name: '桃子', radius: 85, color: '#ffc0cb', score: 64, emoji: '🍑' },
  { name: '菠萝', radius: 100, color: '#ffd700', score: 128, emoji: '🍍' },
  { name: '椰子', radius: 120, color: '#8b4513', score: 256, emoji: '🥥' },
  { name: '西瓜', radius: 150, color: '#228b22', score: 512, emoji: '🍉' },
  { name: '刘院长', radius: 180, color: '#006400', score: 1024, emoji: '🍉' },
];

const Game: React.FC = () => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameWin, setGameWin] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const [maxFruitLevel, setMaxFruitLevel] = useState(0);
  const [currentFruitIndex, setCurrentFruitIndex] = useState(0);
  const [nextFruitIndex, setNextFruitIndex] = useState(() => Math.floor(Math.random() * 3));
  
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
  const fruitStayAboveLine = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    // 预加载图片
    const img = new Image();
    img.src = 'tie_yan.png';
    img.onload = () => {
      fruitImages.current.set('tie_yan', img);
    };

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
      
      // 绘制死亡线
      context.beginPath();
      context.moveTo(0, gameOverLineY);
      context.lineTo(width, gameOverLineY);
      context.strokeStyle = 'rgba(255, 0, 0, 0.5)';
      context.setLineDash([5, 5]);
      context.lineWidth = 2;
      context.stroke();
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

          // 如果是最后一个等级（刘院长），绘制图片
          if (index === fruitConfig.length - 1) {
            const img = fruitImages.current.get('tie_yan');
            if (img && img.complete) { // 增加 complete 检查
              context.drawImage(img, -config.radius, -config.radius, config.radius * 2, config.radius * 2);
            } else {
              // 如果还没加载完，先画个圆占位
              context.beginPath();
              context.arc(0, 0, config.radius, 0, Math.PI * 2);
              context.fillStyle = config.color;
              context.fill();
            }
          } else {
            context.font = `${config.radius * 1.5}px Arial`;
            context.fillText(config.emoji, 0, 0);
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
            if (bodyA.isStatic || bodyB.isStatic) return;
            
            processedCollisions.add(collisionId);
            
            const x = (bodyA.position.x + bodyB.position.x) / 2;
            const y = (bodyA.position.y + bodyB.position.y) / 2;
            
            Matter.World.remove(engine.world, [bodyA, bodyB]);
            
            const newLevel = level + 1;
            const newFruit = createFruit(x, y, newLevel);
            Matter.World.add(engine.world, newFruit);
            
            // 更新最高等级记录
            setMaxFruitLevel(prev => Math.max(prev, newLevel));
            
            createParticles(x, y, fruitConfig[level].color);
            setScore((prev) => prev + fruitConfig[newLevel].score);

            // 胜利判定：合成出最后一个等级
            if (newLevel === fruitConfig.length - 1) {
              setGameWin(true);
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

    // 游戏结束检测
    const checkGameOver = setInterval(() => {
      if (gameOver || gameWin) return; // 胜利后不再检测失败
      const allBodies = Matter.Composite.allBodies(engine.world);
      const now = Date.now();
      for (const body of allBodies) {
        if (!body.isStatic && body.label.startsWith('fruit_')) {
          const index = parseInt(body.label.split('_')[1]);
          const radius = fruitConfig[index].radius;
          
          // 只要水果的顶部超过了死亡线，且速度较慢（判定为堆积而非刚落下）
          if (body.position.y - radius < gameOverLineY && body.velocity.y < 0.2) {
            if (!fruitStayAboveLine.current.has(body.id)) {
              fruitStayAboveLine.current.set(body.id, now);
            } else {
              const stayTime = now - fruitStayAboveLine.current.get(body.id)!;
              if (stayTime > 2000) { // 稍微缩短判定时间到 2 秒，增加紧张感
                setGameOver(true);
                break;
              }
            }
          } else {
            fruitStayAboveLine.current.delete(body.id);
          }
        }
      }
    }, 500);

    // 运行
    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);
    Matter.Render.run(render);

    return () => {
      clearInterval(checkGameOver);
      Matter.Render.stop(render);
      Matter.Engine.clear(engine);
      render.canvas.remove();
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
    const radius = fruitConfig[currentFruitIndex].radius;
    x = Math.max(radius, Math.min(dimensions.width - radius, x));
    
    // 按下时立即生成水果
    if (!currentFruitBody.current) {
      const fruit = createFruit(x, 100 * dimensions.scale, currentFruitIndex, true);
      currentFruitBody.current = fruit;
      Matter.World.add(engineRef.current!.world, fruit);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDropping.current || gameOver || gameWin || showTutorial) return;
    const rect = sceneRef.current?.getBoundingClientRect();
    if (!rect) return;
    let x = e.clientX - rect.left;
    const radius = fruitConfig[currentFruitIndex].radius;
    x = Math.max(radius, Math.min(dimensions.width - radius, x));
    if (!currentFruitBody.current) {
      const fruit = createFruit(x, 100 * dimensions.scale, currentFruitIndex, true);
      currentFruitBody.current = fruit;
      Matter.World.add(engineRef.current!.world, fruit);
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
    
    // 立即准备下一个水果，取消 1000ms 的等待
    setCurrentFruitIndex(nextFruitIndex);
    
    // 生成逻辑：初级 ~ 当前最高档-3级，最少保留前3种
    const maxRandomLevel = Math.max(3, maxFruitLevel - 2);
    setNextFruitIndex(Math.floor(Math.random() * maxRandomLevel));
    
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
          fontSize: `${32 * dimensions.scale}px`,
          fontWeight: 'bold',
          textShadow: '1px 1px 2px white'
        }}>
          得分: {score}
          {/* 常驻显示合成顺序 */}
          <div className="sequence-display" style={{
            marginTop: `${12 * dimensions.scale}px`,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.75)',
            padding: `${8 * dimensions.scale}px ${15 * dimensions.scale}px`,
            borderRadius: `${12 * dimensions.scale}px`,
            fontSize: `${16 * dimensions.scale}px`,
            width: `${280 * dimensions.scale}px`,
            gap: `${4 * dimensions.scale}px`,
            border: '1px solid rgba(0,0,0,0.1)',
            boxShadow: '0 4px 10px rgba(0,0,0,0.08)'
          }}>
            {fruitConfig.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: `${20 * dimensions.scale}px` }}>{i === fruitConfig.length - 1 ? '刘' : f.emoji}</span>
                {i < fruitConfig.length - 1 && <span style={{ margin: `0 ${2 * dimensions.scale}px`, opacity: 0.3, fontSize: `${14 * dimensions.scale}px` }}>→</span>}
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
          padding: `${12 * dimensions.scale}px`,
          borderRadius: `${15 * dimensions.scale}px`,
          border: '1px solid rgba(0,0,0,0.1)',
          boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
          minWidth: `${60 * dimensions.scale}px`
        }}>
          <div style={{ fontSize: `${20 * dimensions.scale}px`, color: '#666', marginBottom: `${4 * dimensions.scale}px` }}>下一个</div>
          <div style={{ fontSize: `${60 * dimensions.scale}px`, lineHeight: 1 }}>{fruitConfig[nextFruitIndex].emoji}</div>
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
          <h2 style={{ color: '#ffcc00', marginBottom: `${20 * dimensions.scale}px`, fontSize: `${24 * dimensions.scale}px` }}>终极目标：合成刘院长</h2>
          <ul style={{ textAlign: 'left', lineHeight: '1.8', fontSize: `${16 * dimensions.scale}px` }}>
            <li>左右滑动：选择位置</li>
            <li>抬起手指：让其掉落</li>
            <li>相同水果碰撞：合成更高级水果</li>
            <li>注意：不要超过红色虚线！</li>
          </ul>
          <h3 style={{ fontSize: `${18 * dimensions.scale}px` }}>合成顺序</h3>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            justifyContent: 'center', 
            gap: `${10 * dimensions.scale}px`,
            background: 'rgba(255,255,255,0.1)',
            padding: `${15 * dimensions.scale}px`,
            borderRadius: `${10 * dimensions.scale}px`,
            marginBottom: `${20 * dimensions.scale}px`
          }}>
            {fruitConfig.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: `${20 * dimensions.scale}px` }}>{i === fruitConfig.length - 1 ? '刘院长' : f.emoji}</span>
                {i < fruitConfig.length - 1 && <span style={{ marginLeft: `${5 * dimensions.scale}px`, opacity: 0.5 }}>→</span>}
              </div>
            ))}
          </div>
          <button 
            onClick={() => setShowTutorial(false)}
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
          <p style={{ fontSize: '20px', fontWeight: 'bold', margin: '10px 0' }}>你成功合成了刘院长！</p>
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
            onClick={() => window.location.reload()}
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
          <p style={{ fontSize: '20px', fontWeight: 'bold', margin: '10px 0' }}>水果堆积过高啦！</p>
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
            onClick={() => window.location.reload()}
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
