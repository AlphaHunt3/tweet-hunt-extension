export interface AvatarSkin {
  nameKey: string;
  light: {
    background: string;
    border: string;
    outerBorder: string;
    textColor: string;
  };
  dark: {
    background: string;
    border: string;
    outerBorder: string;
    textColor: string;
  };
}

export const avatarSkins: Record<string, AvatarSkin> = {
  // ===== 饱和度较高（原有 4 套，跟随主题） =====
  'skin-1': {
    nameKey: 'avatarSkin.default',
    light: {
      background: 'linear-gradient(135deg,#1D9BF0cc,#7c3aedcc)',
      border: 'rgba(255, 255, 255, 0.18)',
      outerBorder: 'rgba(29, 155, 240, 0.32)',
      textColor: 'rgba(255, 255, 255, 0.96)',
    },
    dark: {
      background:
        'linear-gradient(135deg, rgba(29, 155, 240, 0.78), rgba(139, 92, 246, 0.78))',
      border: 'rgba(255, 255, 255, 0.12)',
      outerBorder: 'rgba(29, 155, 240, 0.32)',
      textColor: 'rgba(255, 255, 255, 0.96)',
    },
  },
  // 'skin-2': {
  //   nameKey: 'avatarSkin.aurora',
  //   light: {
  //     background:
  //       'linear-gradient(135deg, rgba(255, 154, 158, 0.9), rgba(254, 207, 239, 0.9), rgba(161, 196, 253, 0.9))',
  //     border: 'rgba(124, 58, 237, 0.1)',
  //     outerBorder: 'rgba(161, 196, 253, 0.45)',
  //     textColor: 'rgba(124, 58, 237, 0.75)',
  //   },
  //   dark: {
  //     background: 'linear-gradient(135deg, #ff758c, #ff7eb3, #82a4ff)',
  //     border: 'rgba(255, 255, 255, 0.15)',
  //     outerBorder: 'rgba(192, 132, 252, 0.45)',
  //     textColor: 'rgba(255, 255, 255, 0.95)',
  //   },
  // },
  // 'skin-3': {
  //   nameKey: 'avatarSkin.moltenGold',
  //   light: {
  //     background:
  //       'linear-gradient(135deg, #c09f3c, #f7d468, #fff2b2, #f7d468, #c09f3c)',
  //     border: 'rgba(40, 25, 10, 0.15)',
  //     outerBorder: 'rgba(247, 212, 104, 0.45)',
  //     textColor: 'rgba(40, 25, 10, 0.85)',
  //   },
  //   dark: {
  //     // 与 light 模式完全相同
  //     background:
  //       'linear-gradient(135deg, #c09f3c, #f7d468, #fff2b2, #f7d468, #c09f3c)',
  //     border: 'rgba(40, 25, 10, 0.15)',
  //     outerBorder: 'rgba(247, 212, 104, 0.45)',
  //     textColor: 'rgba(40, 25, 10, 0.85)',
  //   },
  // },
  // 10) 深海青（向 emerald-500 靠拢：墨绿 -> 翠绿）
  'skin-10': {
    nameKey: 'avatarSkin.deepSea',
    light: {
      background:
        'linear-gradient(135deg, rgba(16, 185, 129, 0.55), rgba(5, 150, 105, 0.55))',
      border: 'rgba(255, 255, 255, 0.18)',
      outerBorder: 'rgba(16, 185, 129, 0.18)',
      textColor: 'rgba(255, 255, 255, 0.92)',
    },
    dark: {
      background:
        'linear-gradient(135deg, rgba(4, 120, 87, 0.62), rgba(6, 95, 70, 0.62))',
      border: 'rgba(255, 255, 255, 0.10)',
      outerBorder: 'rgba(16, 185, 129, 0.18)',
      textColor: 'rgba(255, 255, 255, 0.92)',
    },
  },
  'skin-4': {
    nameKey: 'avatarSkin.rose',
    light: {
      background:
        'linear-gradient(135deg, rgba(254, 226, 226, 0.78), rgba(252, 231, 243, 0.78))',
      border: 'rgba(157, 23, 77, 0.05)',
      outerBorder: 'rgba(251, 146, 156, 0.12)',
      textColor: 'rgba(136, 19, 55, 0.80)',
    },
    dark: {
      background:
        'linear-gradient(135deg, rgba(251, 113, 133, 0.74), rgba(236, 72, 153, 0.74))',
      border: 'rgba(255, 255, 255, 0.05)',
      outerBorder: 'rgba(251, 146, 156, 0.12)',
      textColor: 'rgba(255, 255, 255, 0.92)',
    },
  },

  // ===== 清淡 / 低调（新增 4 套，固定不跟随：light/dark 写成一样） =====
  // 说明：为了满足“黑夜也能用白色 / 白天也能用黑色”，这些皮肤不随 data-theme 切换。

  // 12) 摩卡金（高级咖啡色）
  'skin-12': {
    nameKey: 'avatarSkin.mochaGold',
    light: {
      background:
        'linear-gradient(135deg, rgba(78, 52, 46, 0.88), rgba(62, 39, 35, 0.88))',
      border: 'rgba(212, 175, 55, 0.18)',
      outerBorder: 'rgba(212, 175, 55, 0.12)',
      textColor: 'rgba(245, 245, 245, 0.92)',
    },
    dark: {
      background:
        'linear-gradient(135deg, rgba(78, 52, 46, 0.88), rgba(62, 39, 35, 0.88))',
      border: 'rgba(212, 175, 55, 0.18)',
      outerBorder: 'rgba(212, 175, 55, 0.12)',
      textColor: 'rgba(245, 245, 245, 0.92)',
    },
  },

  // 6) 黑曜（深色、极简）
  'skin-6': {
    nameKey: 'avatarSkin.obsidian',
    light: {
      background: 'rgba(45, 45, 42, 0.88)',
      border: 'rgba(255, 255, 255, 0.04)',
      outerBorder: 'rgba(148, 163, 184, 0.12)',
      textColor: 'rgba(231, 232, 233, 0.88)',
    },
    dark: {
      background: 'rgba(45, 45, 42, 0.88)',
      border: 'rgba(255, 255, 255, 0.04)',
      outerBorder: 'rgba(148, 163, 184, 0.12)',
      textColor: 'rgba(231, 232, 233, 0.88)',
    },
  },
  // 11) 午夜石板（深邃蓝灰色，非纯黑）
  'skin-11': {
    nameKey: 'avatarSkin.midnightSlate',
    light: {
      // 固定暗色
      background:
        'linear-gradient(135deg, rgba(45, 55, 72, 0.50), rgba(26, 32, 44, 0.50))',
      border: 'rgba(255, 255, 255, 0.08)',
      outerBorder: 'rgba(160, 174, 192, 0.20)',
      textColor: 'rgba(255, 255, 255, 0.88)',
    },
    dark: {
      background:
        'linear-gradient(135deg, rgba(45, 55, 72, 0.78), rgba(26, 32, 44, 0.78))',
      border: 'rgba(255, 255, 255, 0.08)',
      outerBorder: 'rgba(160, 174, 192, 0.20)',
      textColor: 'rgba(255, 255, 255, 0.88)',
    },
  },

  // 5) 薰衣草雾（浅紫灰，更容易和「月白」区分）
  'skin-5': {
    nameKey: 'avatarSkin.lavenderMist',
    light: {
      background:
        'linear-gradient(135deg, rgba(250, 245, 255, 0.88), rgba(237, 233, 254, 0.88))',
      border: 'rgba(255, 255, 255, 0.24)',
      outerBorder: 'rgba(167, 139, 250, 0.18)',
      textColor: 'rgba(30, 27, 75, 0.66)',
    },
    dark: {
      background:
        'linear-gradient(135deg, rgba(250, 245, 255, 0.88), rgba(237, 233, 254, 0.88))',
      border: 'rgba(255, 255, 255, 0.24)',
      outerBorder: 'rgba(167, 139, 250, 0.18)',
      textColor: 'rgba(30, 27, 75, 0.66)',
    },
  },

  // 7) 月白（纯浅色、干净）
  'skin-7': {
    nameKey: 'avatarSkin.moon',
    light: {
      background:
        'linear-gradient(135deg, rgba(255, 255, 255, 0.90), rgba(241, 245, 249, 0.90))',
      border: 'rgba(15, 23, 42, 0.06)',
      outerBorder: 'rgba(148, 163, 184, 0.12)',
      textColor: 'rgba(15, 23, 42, 0.68)',
    },
    dark: {
      background:
        'linear-gradient(135deg, rgba(255, 255, 255, 0.90), rgba(241, 245, 249, 0.90))',
      border: 'rgba(15, 23, 42, 0.06)',
      outerBorder: 'rgba(148, 163, 184, 0.12)',
      textColor: 'rgba(15, 23, 42, 0.82)',
    },
  },

  // 8) 海盐蓝（淡蓝灰、克制）
  'skin-8': {
    nameKey: 'avatarSkin.seasalt',
    light: {
      background:
        'linear-gradient(135deg, rgba(239, 246, 255, 0.88), rgba(224, 231, 255, 0.88))',
      border: 'rgba(255, 255, 255, 0.28)',
      outerBorder: 'rgba(99, 102, 241, 0.22)',
      textColor: 'rgba(15, 23, 42, 0.72)',
    },
    dark: {
      background:
        'linear-gradient(135deg, rgba(239, 246, 255, 0.88), rgba(224, 231, 255, 0.88))',
      border: 'rgba(255, 255, 255, 0.28)',
      outerBorder: 'rgba(99, 102, 241, 0.22)',
      textColor: 'rgba(15, 23, 42, 0.72)',
    },
  },

  // 9) 极简白（保持克制，但给徽章一个浅色底，避免浅色头像上文字消失）
  'skin-9': {
    nameKey: 'avatarSkin.minimal',
    light: {
      background:
        'linear-gradient(135deg, rgba(255, 255, 255, 0.82), rgba(248, 250, 252, 0.76))',
      border: 'rgba(15, 23, 42, 0.06)',
      outerBorder: 'rgba(148, 163, 184, 0.10)',
      textColor: 'rgba(15, 23, 42, 0.74)',
    },
    dark: {
      background:
        'linear-gradient(135deg, rgba(255, 255, 255, 0.82), rgba(248, 250, 252, 0.76))',
      border: 'rgba(15, 23, 42, 0.06)',
      outerBorder: 'rgba(148, 163, 184, 0.10)',
      textColor: 'rgba(15, 23, 42, 0.74)',
    },
  },
};
