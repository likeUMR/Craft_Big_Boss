/**
 * 程序化音效管理类
 * 使用 Web Audio API 生成音效，无需外部音频文件
 */
class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private enabled: boolean = true;
  private warningInterval: any = null;
  private isGameActive: boolean = true;

  constructor() {
    // 延迟初始化
  }

  private init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.value = 0.4; // 稍微调高主音量
    } catch (e) {
      console.error('Web Audio API not supported', e);
    }
  }

  public resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.isGameActive = true;
  }

  /**
   * 停止所有正在播放或计划播放的声音
   */
  public stopAll() {
    this.stopWarning();
    this.isGameActive = false;
    // 如果需要强制停止所有当前节点，可以追踪所有活跃节点，但对于简单的短音效，阻止新音效播放通常足够
  }

  /**
   * 播放生成音效
   */
  public playCreate() {
    if (!this.enabled || !this.isGameActive) return;
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  /**
   * 播放合成音效
   */
  public playMerge(level: number) {
    if (!this.enabled || !this.isGameActive) return;
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const baseFreq = 200;
    const freq = baseFreq + level * 50;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  /**
   * 播放掉落音效
   */
  public playDrop() {
    if (!this.enabled || !this.isGameActive) return;
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  /**
   * 开始持续的危险警告音 (脉冲感增强)
   */
  public startWarning() {
    if (!this.enabled || !this.isGameActive || this.warningInterval) return;
    this.resume();

    const playPulse = () => {
      if (!this.ctx || !this.masterGain || !this.isGameActive) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      // 降低一点频率，但提高音量，使其更具威慑力
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime); 
      
      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + 0.05);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.25);
      
      osc.connect(gain);
      gain.connect(this.masterGain);
      
      osc.start();
      osc.stop(this.ctx.currentTime + 0.25);
    };

    playPulse();
    this.warningInterval = setInterval(playPulse, 400); // 稍微加快节奏
  }

  /**
   * 停止危险警告音
   */
  public stopWarning() {
    if (this.warningInterval) {
      clearInterval(this.warningInterval);
      this.warningInterval = null;
    }
  }

  /**
   * 播放游戏结束音效 (短时下降音)
   */
  public playGameOver() {
    // 立即停止警告并标记游戏结束，阻止新声音
    this.stopAll();
    
    if (!this.enabled) return;
    this.init(); // 确保初始化
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 1.0);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.0);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 1.0);
  }

  /**
   * 播放胜利音效
   */
  public playWin() {
    this.stopAll();
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; 
    
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      
      gain.gain.setValueAtTime(0.2, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.4);
      
      osc.connect(gain);
      gain.connect(this.masterGain!);
      
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.4);
    });
  }

  public vibrate(_pattern: number | number[]) {
    // 禁用振动
  }
}

export const soundManager = new SoundManager();
