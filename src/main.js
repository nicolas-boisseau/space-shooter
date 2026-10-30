import Phaser from 'phaser';
import { BordeauxBackground } from './background/BordeauxBackground.js';
import './style.css';

const GAME_WIDTH = 480;
const GAME_HEIGHT = 720;
const PLAYER_FRAME_WIDTH = 96;
const PLAYER_FRAME_HEIGHT = 128;
const PLAYER_ANIMATIONS = ['mantis-left', 'mantis-left-half', 'mantis-idle', 'mantis-right-half', 'mantis-right'];
const ENEMY_ANIMATIONS = ['viper-flight', 'wisp-flight', 'bastion-flight'];
const COLORS = {
  bullet: 0xaafbed,
  yellow: 0xffdf62,
  violet: 0xc28aff,
  orange: 0xff9856
};

class ShooterScene extends Phaser.Scene {
  constructor() {
    super('Shooter');
  }

  preload() {
    this.load.spritesheet('mantis', `${import.meta.env.BASE_URL}assets/mantis.png`, {
      frameWidth: PLAYER_FRAME_WIDTH,
      frameHeight: PLAYER_FRAME_HEIGHT
    });
    this.load.spritesheet('enemies', `${import.meta.env.BASE_URL}assets/enemies.png`, {
      frameWidth: 96,
      frameHeight: 128
    });
    this.load.spritesheet('explosions', `${import.meta.env.BASE_URL}assets/explosions.png`, {
      frameWidth: 128,
      frameHeight: 128
    });
  }

  create() {
    if (!this.textures.exists('mantis')) {
      throw new Error('Impossible de charger le vaisseau : assets/mantis.png');
    }
    if (!this.textures.exists('enemies')) {
      throw new Error('Impossible de charger les ennemis : assets/enemies.png');
    }
    if (!this.textures.exists('explosions')) {
      throw new Error('Impossible de charger les explosions : assets/explosions.png');
    }

    this.score = 0;
    this.elapsed = 0;
    this.spawnElapsed = 0;
    this.fireDelay = 720;
    this.fireElapsed = this.fireDelay;
    this.shotCount = 1;
    this.weaponType = 'bullet';
    this.gameOver = false;
    this.restartReady = false;
    this.enemies = [];
    this.bullets = [];
    this.powerups = [];
    this.playerBank = 0;
    this.touchPointer = null;

    this.drawBackground();
    [
      { key: 'enemy-explosion', start: 0, end: 11, duration: 600 },
      { key: 'player-explosion', start: 12, end: 23, duration: 850 }
    ].forEach(({ key, start, end, duration }) => {
      if (!this.anims.exists(key)) {
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers('explosions', { start, end }),
          duration,
          repeat: 0
        });
      }
    });
    PLAYER_ANIMATIONS.forEach((key, column) => {
      if (!this.anims.exists(key)) {
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers('mantis', {
            frames: [column, column + 5, column + 10, column + 15]
          }),
          frameRate: 12,
          repeat: -1
        });
        ENEMY_ANIMATIONS.forEach((key, column) => {
          if (!this.anims.exists(key)) {
            this.anims.create({
              key,
              frames: this.anims.generateFrameNumbers('enemies', {
                frames: [column, column + 3, column + 6, column + 9]
              }),
              frameRate: 12,
              repeat: -1,
              randomFrame: true
            });
          }
        });
      }
    });
    this.player = this.add.sprite(
      GAME_WIDTH / 2,
      GAME_HEIGHT - 90,
      'mantis',
      2
    ).setOrigin(0.5, 57 / PLAYER_FRAME_HEIGHT).setScale(0.5).setDepth(2);
    this.player.play('mantis-idle');
    this.playerSpeed = 280;

    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.addCapture('SPACE,UP,DOWN,LEFT,RIGHT');
    this.restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.input.on('pointerdown', (pointer) => {
      if (!pointer.wasTouch) return;
      if (this.gameOver) {
        if (this.restartReady) this.scene.restart();
        return;
      }
      if (!this.touchPointer) this.touchPointer = pointer;
    });
    const releaseTouch = (pointer) => {
      if (pointer === this.touchPointer) this.touchPointer = null;
    };
    const clearTouch = () => { this.touchPointer = null; };
    this.input.on('pointerup', releaseTouch);
    this.input.on('pointerupoutside', releaseTouch);
    this.input.on('gameout', clearTouch);
    this.game.events.on(Phaser.Core.Events.BLUR, clearTouch);
    this.game.events.on(Phaser.Core.Events.HIDDEN, clearTouch);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      clearTouch();
      this.game.events.off(Phaser.Core.Events.BLUR, clearTouch);
      this.game.events.off(Phaser.Core.Events.HIDDEN, clearTouch);
    });

    this.scoreText = this.add.text(18, 18, 'SCORE  000000', {
      fontFamily: 'DM Mono, monospace', fontSize: '12px', color: '#dce8ff',
      stroke: '#080e20', strokeThickness: 3
    }).setDepth(5);
    this.weaponText = this.add.text(GAME_WIDTH - 18, 18, 'TIR SIMPLE', {
      fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#8fa0c3',
      align: 'right', stroke: '#080e20', strokeThickness: 3
    }).setOrigin(1, 0).setDepth(5);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 18, '↑ BORDEAUX · CAP AU NORD', {
      fontFamily: 'DM Mono, monospace', fontSize: '8px', color: '#e0e5cf',
      stroke: '#294f50', strokeThickness: 3, letterSpacing: 2
    }).setOrigin(0.5, 1).setDepth(1);
  }

  drawBackground() {
    this.background = new BordeauxBackground(this);
    this.add.rectangle(0, 0, GAME_WIDTH, 42, 0x122b35, 0.8).setOrigin(0).setDepth(4.5);
  }

  update(_time, delta) {
    if (this.gameOver) {
      if (Phaser.Input.Keyboard.JustDown(this.restartKey) && this.restartReady) {
        this.scene.restart();
      }
      return;
    }

    const step = Math.min(delta, 40);
    this.elapsed += step;
    this.background.update(step);
    this.movePlayer(step);
    this.updateShooting(step);
    this.updateEnemies(step);
    if (this.gameOver) return;
    this.updateBullets(step);
    this.updatePowerups(step);
    this.spawnElapsed += step;

    const spawnDelay = Math.max(430, 1250 - this.elapsed * 0.012);
    if (this.spawnElapsed >= spawnDelay) {
      this.spawnElapsed -= spawnDelay;
      this.spawnEnemy();
    }
  }

  movePlayer(delta) {
    if (this.touchPointer && !this.touchPointer.isDown) this.touchPointer = null;
    let dx = Number(this.cursors.right.isDown) - Number(this.cursors.left.isDown);
    let dy = Number(this.cursors.down.isDown) - Number(this.cursors.up.isDown);
    if (dx !== 0 && dy !== 0) {
      dx *= Math.SQRT1_2;
      dy *= Math.SQRT1_2;
    }
    const nextX = Phaser.Math.Clamp(
      this.touchPointer ? this.touchPointer.x : this.player.x + dx * this.playerSpeed * delta / 1000,
      24, GAME_WIDTH - 24
    );
    const nextY = Phaser.Math.Clamp(
      this.touchPointer ? this.touchPointer.y : this.player.y + dy * this.playerSpeed * delta / 1000,
      34, GAME_HEIGHT - 42
    );
    const targetBank = this.touchPointer ? Math.sign(nextX - this.player.x) : Math.sign(dx);
    this.playerBank += Phaser.Math.Clamp(targetBank - this.playerBank, -delta * 0.005, delta * 0.005);
    const bankFrame = Math.round(this.playerBank * 2) + 2;
    this.player.play(PLAYER_ANIMATIONS[bankFrame], true);
    this.player.setPosition(nextX, nextY);
  }

  updateShooting(delta) {
    this.fireElapsed += delta;
    if ((this.cursors.space.isDown || this.touchPointer?.isDown) && this.fireElapsed >= this.fireDelay) {
      this.fireElapsed = 0;
      this.fire();
    }
  }

  fire() {
    const spacing = this.weaponType === 'laser' ? 13 : 10;
    const spread = Math.min(0.28, (this.shotCount - 1) * 0.09);
    for (let i = 0; i < this.shotCount; i += 1) {
      const ratio = this.shotCount === 1 ? 0 : (i / (this.shotCount - 1)) * 2 - 1;
      const angle = ratio * spread;
      let projectile;
      if (this.weaponType === 'missile') {
        projectile = this.add.circle(this.player.x + ratio * spacing, this.player.y - 30, 4, COLORS.orange);
      } else {
        const height = this.weaponType === 'laser' ? 27 : 13;
        const color = this.weaponType === 'laser' ? COLORS.violet : COLORS.bullet;
        projectile = this.add.rectangle(this.player.x + ratio * spacing, this.player.y - 30, this.weaponType === 'laser' ? 4 : 2.5, height, color);
      }
      projectile.setDepth(2);
      this.bullets.push({
        sprite: projectile,
        vx: Math.sin(angle) * 380,
        vy: -Math.cos(angle) * 430,
        damage: this.weaponType === 'laser' ? 2 : 1
      });
    }
  }

  spawnEnemy() {
    const sideEntry = Math.random() < 0.32;
    const fromLeft = Math.random() < 0.5;
    const x = sideEntry ? (fromLeft ? -18 : GAME_WIDTH + 18) : Phaser.Math.Between(24, GAME_WIDTH - 24);
    const y = sideEntry ? Phaser.Math.Between(36, 140) : -20;
    const appearance = Phaser.Math.Between(0, ENEMY_ANIMATIONS.length - 1);
    const enemy = this.add.sprite(x, y, 'enemies', appearance)
      .setOrigin(0.5, 69 / 128)
      .setScale(0.5)
      .setDepth(2)
      .play(ENEMY_ANIMATIONS[appearance]);
    const inward = sideEntry ? (fromLeft ? 1 : -1) : Phaser.Math.FloatBetween(-0.2, 0.2);
    const vx = inward * Phaser.Math.Between(55, 115);
    const vy = Phaser.Math.Between(72, 112) + Math.min(70, this.elapsed / 18000);
    enemy.setRotation(-Math.atan2(vx, vy));
    this.enemies.push({
      sprite: enemy,
      vx,
      vy,
      hp: 1
    });
  }

  updateEnemies(delta) {
    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = this.enemies[i];
      enemy.sprite.x += enemy.vx * delta / 1000;
      enemy.sprite.y += enemy.vy * delta / 1000;

      if (enemy.sprite.y > GAME_HEIGHT + 30 || enemy.sprite.x < -35 || enemy.sprite.x > GAME_WIDTH + 35) {
        enemy.sprite.destroy();
        this.enemies.splice(i, 1);
        continue;
      }
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.sprite.x, enemy.sprite.y) < 27) {
        this.endGame();
        return;
      }
    }
  }

  updateBullets(delta) {
    for (let i = this.bullets.length - 1; i >= 0; i -= 1) {
      const bullet = this.bullets[i];
      bullet.sprite.x += bullet.vx * delta / 1000;
      bullet.sprite.y += bullet.vy * delta / 1000;
      if (bullet.sprite.y < -30 || bullet.sprite.x < -20 || bullet.sprite.x > GAME_WIDTH + 20) {
        bullet.sprite.destroy();
        this.bullets.splice(i, 1);
        continue;
      }

      let hit = false;
      for (let enemyIndex = this.enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
        const enemy = this.enemies[enemyIndex];
        if (Phaser.Math.Distance.Between(bullet.sprite.x, bullet.sprite.y, enemy.sprite.x, enemy.sprite.y) < 18) {
          enemy.hp -= bullet.damage;
          bullet.sprite.destroy();
          this.bullets.splice(i, 1);
          if (enemy.hp <= 0) {
            this.destroyEnemy(enemyIndex);
          }
          hit = true;
          break;
        }
      }
      if (hit) continue;
    }
  }

  destroyEnemy(index) {
    const enemy = this.enemies[index];
    const { x, y } = enemy.sprite;
    this.score += 100;
    this.scoreText.setText(`SCORE  ${String(this.score).padStart(6, '0')}`);
    this.playExplosion(x, y, 'enemy-explosion', 0.75);
    enemy.sprite.destroy();
    this.enemies.splice(index, 1);
    if (Math.random() < 0.28) this.spawnPowerup(x, y);
  }

  spawnPowerup(x, y) {
    const type = Phaser.Math.RND.pick(['multishot', 'rapid', 'weapon']);
    const color = type === 'multishot' ? COLORS.yellow : type === 'rapid' ? COLORS.violet : COLORS.orange;
    const label = type === 'multishot' ? '+' : type === 'rapid' ? '»' : '◆';
    const outer = this.add.circle(x, y, 10, color).setDepth(2);
    outer.setStrokeStyle(2, 0xffffff, 0.6);
    const mark = this.add.text(x, y, label, {
      fontFamily: 'DM Mono, monospace', fontSize: type === 'weapon' ? '9px' : '12px',
      color: '#172039', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(3);
    this.powerups.push({ x, y, type, outer, mark, phase: Math.random() * Math.PI * 2 });
  }

  updatePowerups(delta) {
    for (let i = this.powerups.length - 1; i >= 0; i -= 1) {
      const item = this.powerups[i];
      item.y += 72 * delta / 1000;
      item.phase += delta * 0.004;
      item.x += Math.sin(item.phase) * delta * 0.018;
      item.outer.setPosition(item.x, item.y);
      item.mark.setPosition(item.x, item.y);
      if (item.y > GAME_HEIGHT + 20) {
        this.removePowerup(i);
        continue;
      }
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, item.x, item.y) < 23) {
        this.applyPowerup(item.type);
        this.removePowerup(i);
      }
    }
  }

  applyPowerup(type) {
    if (type === 'multishot') {
      this.shotCount = Math.min(5, this.shotCount + 1);
    } else if (type === 'rapid') {
      this.fireDelay = Math.max(180, this.fireDelay - 100);
    } else {
      const weapons = ['bullet', 'missile', 'laser'];
      this.weaponType = weapons[(weapons.indexOf(this.weaponType) + 1) % weapons.length];
    }
    const weaponNames = { bullet: 'TIR SIMPLE', missile: 'MISSILES', laser: 'LASERS' };
    this.weaponText.setText(`${weaponNames[this.weaponType]}  ·  ×${this.shotCount}`);
  }

  removePowerup(index) {
    const item = this.powerups[index];
    item.outer.destroy();
    item.mark.destroy();
    this.powerups.splice(index, 1);
  }

  playExplosion(x, y, animation, scale) {
    const explosion = this.add.sprite(x, y, 'explosions')
      .setScale(scale)
      .setDepth(4);
    explosion.once('animationcomplete', () => explosion.destroy());
    explosion.play(animation);
    return explosion;
  }

  endGame() {
    if (this.gameOver) return;
    this.gameOver = true;
    this.touchPointer = null;
    this.player.anims.stop();
    for (const enemy of this.enemies) enemy.sprite.anims.stop();
    this.player.setVisible(false);
    const explosion = this.playExplosion(this.player.x, this.player.y, 'player-explosion', 1.15);
    explosion.once('animationcomplete', () => this.showGameOver());
  }

  showGameOver() {
    this.restartReady = true;
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x050914, 0.75).setDepth(8);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 25, 'MISSION ÉCHOUÉE', {
      fontFamily: 'Space Grotesk, sans-serif', fontSize: '25px', color: '#f4f6ff',
      fontStyle: 'bold', letterSpacing: 1
    }).setOrigin(0.5).setDepth(9);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 17, `SCORE  ${String(this.score).padStart(6, '0')}\nENTRÉE OU TOUCHER POUR REJOUER`, {
      fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#9aa8c7',
      letterSpacing: 1, align: 'center', lineSpacing: 10
    }).setOrigin(0.5).setDepth(9);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  backgroundColor: '#080e20',
  parent: 'game-container',
  scene: ShooterScene,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT
  },
  render: {
    antialias: true,
    roundPixels: false
  }
});
