import type { BilingualText } from '../types/route'

export interface DailyChallengeGuideContent {
  title: BilingualText
  welcome: BilingualText
  overview: BilingualText
  challengeHeading: BilingualText
  assignedRouteHeading: BilingualText
  requirementsHeading: BilingualText
  requirementsIntro: BilingualText
  requirements: BilingualText[]
  scoringHeading: BilingualText
  scoringIntro: BilingualText
  scoring: BilingualText[]
  rewardsHeading: BilingualText
  rewardsIntro: BilingualText
  rewards: BilingualText[]
  notesHeading: BilingualText
  notes: BilingualText[]
  closingLead: BilingualText
  closing: BilingualText
}

export const DAILY_CHALLENGE_GUIDE: DailyChallengeGuideContent = {
  title: {
    zh: '🏆 每日挑战（Daily Challenge）',
    en: '🏆 Daily Challenge',
  },
  welcome: {
    zh: '欢迎参加 Sunshine Island Bus Simulator 每日挑战！',
    en: 'Welcome to the Sunshine Islands Bus Simulator Daily Challenge!',
  },
  overview: {
    zh: '每日挑战将随机指定一条线路和运营要求，玩家需要按照规定完成任务。挑战内容每天更新，为驾驶员带来全新的运营体验。',
    en: 'Each day a route and operating requirements are assigned at random. Complete the task as required — the challenge refreshes daily for a new driving experience.',
  },
  challengeHeading: {
    zh: '挑战内容',
    en: 'Challenge details',
  },
  assignedRouteHeading: {
    zh: '指定线路',
    en: 'Assigned route',
  },
  requirementsHeading: {
    zh: '运营要求',
    en: 'Operating requirements',
  },
  requirementsIntro: {
    zh: '挑战可能包含以下要求：',
    en: 'A challenge may include requirements such as:',
  },
  requirements: [
    { zh: '按照完整线路运营', en: 'Operate the full route' },
    { zh: '不得跳站', en: 'Do not skip stops' },
    { zh: '准点率达到指定标准', en: 'Meet the on-time performance target' },
    { zh: '限定车辆类型', en: 'Use a restricted vehicle type' },
    { zh: '限定天气条件', en: 'Operate under specific weather conditions' },
  ],
  scoringHeading: {
    zh: '评分标准',
    en: 'Scoring',
  },
  scoringIntro: {
    zh: '完成挑战后将根据以下项目评分：',
    en: 'After completing a challenge, you are scored on:',
  },
  scoring: [
    { zh: '准点率', en: 'On-time performance' },
    { zh: '乘客满意度', en: 'Passenger satisfaction' },
    { zh: '安全驾驶表现', en: 'Safe driving' },
    { zh: '挑战完成时间（仅限比赛挑战）', en: 'Completion time (racing challenges only)' },
  ],
  rewardsHeading: {
    zh: '奖励',
    en: 'Rewards',
  },
  rewardsIntro: {
    zh: '成功完成每日挑战可获得：',
    en: 'Successfully completing a daily challenge grants:',
  },
  rewards: [
    {
      zh: '阳光碎片奖励（根据比赛排名可获得更多）',
      en: 'Sunshards (more for higher race rankings)',
    },
    { zh: '经验值奖励', en: 'Experience points' },
  ],
  notesHeading: {
    zh: '注意事项',
    en: 'Notes',
  },
  notes: [{ zh: '跳过站点将视为挑战失败。', en: 'Skipping a stop counts as a failed challenge.' }],
  closingLead: {
    zh: '准备好了吗？',
    en: 'Ready?',
  },
  closing: {
    zh: '启动发动机，打开车门，开始今天的运营任务吧！',
    en: 'Start your engine, open the doors, and begin today’s shift!',
  },
}

export function getAssignedRouteDescription(routeNumber: string): BilingualText {
  return {
    zh: `系统每天将随机选择一条运营线路作为挑战线路，今天的线路：${routeNumber}`,
    en: `Each day the system picks one route as the challenge route. Today's route: ${routeNumber}`,
  }
}
