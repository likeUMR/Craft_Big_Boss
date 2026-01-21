import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';

const FRUIT_CONFIG = [
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
  { name: '大西瓜', radius: 180, color: '#006400', score: 1024, emoji: '🍉' },
];

const Game: React.FC = () => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [currentFruitIndex, setCurrentFruitIndex] = useState(0);
  const [nextFruitIndex, setNextFruitIndex] = useState(() => Math.floor(Math.random() * 5));
  const [dimensions, setDimensions] = useState({
    width: Math.min(window.innerWidth, 500),
    height: window.innerHeight
  });
  const isDropping = useRef(false);
  const currentFruitBody = useRef<Matter.Body | null>(null);
  const gameOverLineY = 150;
  const fruitStayAboveLine = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: Math.min(window.innerWidth, 500),
        height: window.innerHeight
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const { width, height } = dimensions;
    
    // 初始化引擎
    const engine = Matter.Engine.create({
      gravity: { y: 1.5 }
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
          const config = FRUIT_CONFIG[index];
          const { x, y } = body.position;
          const angle = body.angle;

          context.save();
          context.translate(x, y);
          context.rotate(angle);
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          context.font = `${config.radius * 1.5}px Arial`;
          context.fillText(config.emoji, 0, 0);
          context.restore();
        }
      });

      // 绘制预览虚线（瞄准线）
      if (currentFruitBody.current && !isDropping.current && !gameOver) {
        const { x } = currentFruitBody.current.position;
        context.beginPath();
        context.moveTo(x, 100);
        context.lineTo(x, height);
        context.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        context.setLineDash([5, 10]);
        context.stroke();
        context.setLineDash([]);
      }
    });

    // 碰撞检测逻辑
    Matter.Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;
        if (bodyA.label === bodyB.label && bodyA.label.startsWith('fruit_')) {
          const level = parseInt(bodyA.label.split('_')[1]);
          if (level < FRUIT_CONFIG.length - 1) {
            if (bodyA.isStatic || bodyB.isStatic) return;
            const x = (bodyA.position.x + bodyB.position.x) / 2;
            const y = (bodyA.position.y + bodyB.position.y) / 2;
            Matter.World.remove(engine.world, [bodyA, bodyB]);
            const newLevel = level + 1;
            const newFruit = createFruit(x, y, newLevel);
            Matter.World.add(engine.world, newFruit);
            createParticles(x, y, FRUIT_CONFIG[level].color);
            setScore((prev) => prev + FRUIT_CONFIG[newLevel].score);
          }
        }
      });
    });

    // 游戏结束检测
    const checkGameOver = setInterval(() => {
      if (gameOver) return;
      const allBodies = Matter.Composite.allBodies(engine.world);
      const now = Date.now();
      for (const body of allBodies) {
        if (!body.isStatic && body.label.startsWith('fruit_')) {
          if (body.position.y < gameOverLineY && body.velocity.y < 0.1) {
            if (!fruitStayAboveLine.current.has(body.id)) {
              fruitStayAboveLine.current.set(body.id, now);
            } else {
              const stayTime = now - fruitStayAboveLine.current.get(body.id)!;
              if (stayTime > 3000) {
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
  }, [dimensions.width, dimensions.height]); // 当尺寸变化时重新初始化

  const createParticles = (x: number, y: number, color: string) => {
    if (!engineRef.current) return;
    const particles: Matter.Body[] = [];
    for (let i = 0; i < 8; i++) {
      const particle = Matter.Bodies.circle(x, y, 5, {
        render: { fillStyle: color },
        frictionAir: 0.05,
        collisionFilter: { group: -1 }
      });
      Matter.Body.setVelocity(particle, {
        x: (Math.random() - 0.5) * 10,
        y: (Math.random() - 0.5) * 10
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
    const config = FRUIT_CONFIG[index];
    return Matter.Bodies.circle(x, y, config.radius, {
      label: `fruit_${index}`,
      restitution: 0.3,
      friction: 0.1,
      isStatic: isStatic,
      render: { fillStyle: config.color },
    });
  };

  const generateNextFruit = () => {
    setNextFruitIndex(Math.floor(Math.random() * 5));
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDropping.current || gameOver) return;
    const rect = sceneRef.current?.getBoundingClientRect();
    if (!rect) return;
    let x = e.clientX - rect.left;
    const radius = FRUIT_CONFIG[currentFruitIndex].radius;
    x = Math.max(radius, Math.min(dimensions.width - radius, x));
    if (!currentFruitBody.current) {
      const fruit = createFruit(x, 100, currentFruitIndex, true);
      currentFruitBody.current = fruit;
      Matter.World.add(engineRef.current!.world, fruit);
    } else {
      Matter.Body.setPosition(currentFruitBody.current, { x, y: 100 });
    }
  };

  const handlePointerUp = () => {
    if (isDropping.current || gameOver || !currentFruitBody.current) return;
    isDropping.current = true;
    Matter.Body.setStatic(currentFruitBody.current, false);
    currentFruitBody.current = null;
    setTimeout(() => {
      setCurrentFruitIndex(nextFruitIndex);
      generateNextFruit();
      isDropping.current = false;
    }, 1000);
  };

  return (
    <div 
      className="game-container" 
      style={{ position: 'relative', width: dimensions.width, height: dimensions.height }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className="score-board" style={{
        position: 'absolute',
        top: 20,
        left: 20,
        color: '#333',
        fontSize: '24px',
        fontWeight: 'bold',
        zIndex: 10,
        pointerEvents: 'none',
        textShadow: '1px 1px 2px white'
      }}>
        得分: {score}
      </div>
      <div className="next-fruit" style={{
        position: 'absolute',
        top: 20,
        right: 20,
        textAlign: 'center',
        background: 'rgba(255, 255, 255, 0.5)',
        padding: '10px',
        borderRadius: '10px',
        zIndex: 10,
        pointerEvents: 'none'
      }}>
        <div style={{ fontSize: '14px', color: '#666' }}>下一个</div>
        <div style={{ fontSize: '30px' }}>{FRUIT_CONFIG[nextFruitIndex].emoji}</div>
      </div>
      <div ref={sceneRef} />
      {gameOver && (
        <div className="game-over" style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '20px',
          borderRadius: '10px',
          textAlign: 'center',
          zIndex: 100
        }}>
          <h2>游戏结束</h2>
          <p>最终得分: {score}</p>
          <button onClick={() => window.location.reload()}>重新开始</button>
        </div>
      )}
    </div>
  );
};

export default Game;
