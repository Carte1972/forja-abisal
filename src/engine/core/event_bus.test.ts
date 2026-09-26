import { describe, expect, it, vi } from 'vitest';
import { EventBus } from './event_bus';

type Events = { noise: { radius: number }; hit: { damage: number } };

describe('EventBus', () => {
  it('entrega el evento solo a los oyentes de ese tipo', () => {
    const bus = new EventBus<Events>();
    const noise = vi.fn();
    const hit = vi.fn();
    bus.on('noise', noise);
    bus.on('hit', hit);
    bus.emit('noise', { radius: 10 });
    expect(noise).toHaveBeenCalledWith({ radius: 10 });
    expect(hit).not.toHaveBeenCalled();
  });

  it('permite darse de baja', () => {
    const bus = new EventBus<Events>();
    const listener = vi.fn();
    const off = bus.on('hit', listener);
    off();
    bus.emit('hit', { damage: 1 });
    expect(listener).not.toHaveBeenCalled();
  });

  it('un oyente puede darse de baja mientras se emite sin afectar a los demás', () => {
    const bus = new EventBus<Events>();
    const second = vi.fn();
    const off = bus.on('hit', () => off());
    bus.on('hit', second);
    bus.emit('hit', { damage: 1 });
    expect(second).toHaveBeenCalledOnce();
  });
});
