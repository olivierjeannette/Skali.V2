import { MemberLayout } from '@/components/layouts/MemberLayout';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <MemberLayout>{children}</MemberLayout>;
}
