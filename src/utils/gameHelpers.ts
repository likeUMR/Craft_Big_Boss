import { Mentor } from '../types';
import mentorsData from '../data/mentors.json';
import { TOTAL_LEVELS } from '../constants/gameConfig';

export const getRandomMentors = (): Mentor[] => {
  const allMentors: Mentor[] = mentorsData as Mentor[];
  const liuTieyan = allMentors.find(m => m.name === '刘铁岩');
  const others = allMentors.filter(m => m.name !== '刘铁岩');
  
  // 随机选择 (TOTAL_LEVELS - 1) 个导师
  const shuffled = [...others].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, TOTAL_LEVELS - 1);
  
  // 刘铁岩固定在最后（最高级）
  if (liuTieyan) {
    selected.push(liuTieyan);
  } else {
    selected.push({ name: '刘铁岩', avatar: 'tie_yan.png', homepage: '' });
  }
  return selected;
};
