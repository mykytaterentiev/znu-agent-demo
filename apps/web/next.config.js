/** @type {import('next').NextConfig} */
const nextConfig = {
	env: {
		REACT_APP_SUPABASE_URL: process.env.REACT_APP_SUPABASE_URL,
		REACT_APP_SUPABASE_PUBLISHABLE_KEY: process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY,
	},
};

export default nextConfig;
