import Phaser from 'phaser';
import { GameScene } from './game/GameScene';
import './styles/main.css';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 600,
  backgroundColor: '#111920',
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 960,
    height: 600,
  },
  scene: [GameScene],
});

window.addEventListener('beforeunload', () => game.destroy(true));
