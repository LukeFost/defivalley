export class Player {
  constructor(
    public readonly id: string,
    public name: string,
    public xp: number,
    public readonly createdAt: Date,
    public updatedAt: Date
  ) {}

  static create(id: string, name: string): Player {
    const now = new Date();
    return new Player(id, name, 0, now, now);
  }

  addXP(amount: number): void {
    if (amount < 0) {
      throw new Error('XP amount must be positive');
    }
    this.xp += amount;
    this.updatedAt = new Date();
  }

  getLevel(): number {
    // Simple level calculation: 1 level per 100 XP
    return Math.floor(this.xp / 100) + 1;
  }
}