import { BankBuilding } from '../BankBuilding';
import { MarketplaceBuilding } from '../MarketplaceBuilding';
import { FlowBankBuilding } from '../FlowBankBuilding';
import { FlowMarketplaceBuilding } from '../FlowMarketplaceBuilding';
import { PepeBuilding } from '../PepeBuilding';
import { katanaChain, flowMainnet } from '../../app/wagmi';
import { Player } from '../Player';

export class BuildingManager {
  private scene: Phaser.Scene;
  private bankBuilding?: BankBuilding;
  private marketplaceBuilding?: MarketplaceBuilding;
  private flowBankBuilding?: FlowBankBuilding;
  private flowMarketplaceBuilding?: FlowMarketplaceBuilding;
  private pepeBuilding?: PepeBuilding;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public createBuildingsBasedOnChain(chainId: number | undefined): void {
    this.destroyBuildings();

    const isOnKatana = chainId === katanaChain.id;
    const isOnFlow = chainId === flowMainnet.id;

    if (isOnKatana) {
      this.bankBuilding = new BankBuilding(this.scene, 800, 600);
      this.marketplaceBuilding = new MarketplaceBuilding(this.scene, 800, 400);
    } else if (isOnFlow) {
      this.flowBankBuilding = new FlowBankBuilding(this.scene, 500, 350);
      this.flowMarketplaceBuilding = new FlowMarketplaceBuilding(this.scene, 500, 750);
      this.pepeBuilding = new PepeBuilding(this.scene, 750, 800);
    } else {
      this.bankBuilding = new BankBuilding(this.scene, 800, 600);
      this.marketplaceBuilding = new MarketplaceBuilding(this.scene, 800, 400);
    }
  }

  public update(time: number, currentPlayer?: Player): void {
    if (!currentPlayer) return;
    const { x, y } = currentPlayer;

    const buildings = this.getBuildings();
    for (const building of buildings) {
      if (building) {
        building.checkPlayerProximity(x, y);
        building.checkInteraction();
      }
    }
  }

  public getBuildings(): (Phaser.GameObjects.Container & { 
    getCollisionBounds: () => Phaser.Geom.Rectangle; 
    checkPlayerProximity: (x: number, y: number) => void;
    checkInteraction: () => void;
  })[] {
    const allBuildings = [
      this.bankBuilding,
      this.marketplaceBuilding,
      this.flowBankBuilding,
      this.flowMarketplaceBuilding,
      this.pepeBuilding
    ];
    return allBuildings.filter(b => b !== undefined) as any[];
  }

  private destroyBuildings(): void {
    this.bankBuilding?.destroy();
    this.marketplaceBuilding?.destroy();
    this.flowBankBuilding?.destroy();
    this.flowMarketplaceBuilding?.destroy();
    this.pepeBuilding?.destroy();
  }
}