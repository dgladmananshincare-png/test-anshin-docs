import type {ReactNode} from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

export default function Home(): ReactNode {
  return (
    <Layout
      title="Anshin Docs"
      description="Anshin公式ドキュメントのホームページ。アプリ、カスタマー、予約関連のセクションへアクセスできます。"
    >
      <header className="bg-gray-100 dark:bg-gray-900">
        <div className="mx-auto max-w-6xl px-6 min-h-[calc(100vh-var(--ifm-navbar-height)-92px)] flex items-center py-6">
          <div className="w-full text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              ようこそ — Anshin Docs
            </h1>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              セクションを選んでドキュメントへ移動してください。
            </p>

            {/* Cards container: flex row with gaps */}
            <div className="mt-12 flex flex-row flex-wrap justify-center gap-6">
              {/* App Card */}
              <div className="rounded-xl bg-white dark:bg-gray-800 shadow ring-1 ring-black/5 p-6 flex flex-col items-center w-72 sm:w-80">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">App</h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">アプリ関連ドキュメント</p>
                <div className="mt-6">
                  <Link
                    className="button button--primary"
                    to="/docs/app"
                  >
                    開く
                  </Link>
                </div>
              </div>

              {/* Customer Card */}
              <div className="rounded-xl bg-white dark:bg-gray-800 shadow ring-1 ring-black/5 p-6 flex flex-col items-center w-72 sm:w-80">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Customer</h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">カスタマー関連</p>
                <div className="mt-6">
                  <Link
                    className="button button--primary"
                    to="/docs/customer"
                  >
                    開く
                  </Link>
                </div>
              </div>

              {/* Reserve Card */}
              <div className="rounded-xl bg-white dark:bg-gray-800 shadow ring-1 ring-black/5 p-6 flex flex-col items-center w-72 sm:w-80">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Reserve</h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">予約関連</p>
                <div className="mt-6">
                  <Link
                    className="button button--primary"
                    to="/docs/reserve"
                  >
                    開く
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
    </Layout>
  );
}
