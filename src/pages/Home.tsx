import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Wand2, Image, Layers, ArrowRight, Sparkles } from 'lucide-react';
import GlassCard from '@/components/GlassCard';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay },
});

export default function Home() {
  const nav = useNavigate();

  return (
    <div className="space-y-20">
      {/* Hero */}
      <section className="relative min-h-[70vh] flex flex-col items-center justify-center text-center">
        <div className="relative z-10 space-y-6 px-4">
          <motion.div {...fadeUp(0)}>
            <Sparkles className="mx-auto mb-4 text-accent" size={40} />
          </motion.div>
          <motion.h1 {...fadeUp(0.1)} className="font-heading text-5xl md:text-6xl font-bold bg-gradient-to-r from-accent via-accent-secondary to-accent bg-clip-text text-transparent animate-gradient bg-[length:200%_200%]">
            Seedance AI 视频生成平台
          </motion.h1>
          <motion.p {...fadeUp(0.2)} className="text-lg text-text-secondary max-w-xl mx-auto">
            基于火山引擎 Seedance 2.0 模型，一键生成高质量视频
          </motion.p>
          <motion.button
            {...fadeUp(0.3)}
            onClick={() => nav('/create')}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-accent text-bg-primary font-semibold text-lg animate-pulse-glow hover:scale-105 transition-transform"
          >
            开始创作 <ArrowRight size={20} />
          </motion.button>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto space-y-8">
        <motion.h2 {...fadeUp(0.1)} className="font-heading text-3xl font-bold text-center">核心能力</motion.h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Wand2, title: '文生视频', desc: '输入文字描述，AI 自动生成匹配视频内容', color: 'text-accent' },
            { icon: Image, title: '图生视频', desc: '上传参考图片，生成风格一致的动态视频', color: 'text-accent-secondary' },
            { icon: Layers, title: '多模态融合', desc: '结合文字与图像素材，创造更精准的视频', color: 'text-success' },
          ].map((f, i) => (
            <GlassCard key={f.title} hover glow="accent" className="text-center p-6">
              <motion.div {...fadeUp(0.2 + i * 0.1)}>
                <f.icon size={36} className={`mx-auto mb-4 ${f.color}`} />
                <h3 className="font-heading text-xl font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-text-secondary">{f.desc}</p>
              </motion.div>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Steps */}
      <section className="max-w-4xl mx-auto space-y-8">
        <motion.h2 {...fadeUp(0.1)} className="font-heading text-3xl font-bold text-center">简单三步</motion.h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { step: '01', title: '输入描述', desc: '用文字描述你想要的视频场景和风格' },
            { step: '02', title: '上传素材', desc: '可选上传参考图片或视频片段' },
            { step: '03', title: '生成视频', desc: 'AI 模型自动生成，下载高清视频' },
          ].map((s, i) => (
            <motion.div key={s.step} {...fadeUp(0.2 + i * 0.1)} className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full border-2 border-accent/40 text-accent font-heading text-xl font-bold">{s.step}</div>
              <h3 className="font-heading text-lg font-semibold">{s.title}</h3>
              <p className="text-sm text-text-secondary">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
