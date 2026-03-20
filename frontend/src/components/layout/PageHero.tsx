import React from 'react';
import { Box, Typography, alpha } from '@mui/material';

interface PageHeroProps {
  title: string;
  subtitle?: string;
  /** Optional gradient key: 'blue' | 'purple' | 'teal' */
  variant?: 'blue' | 'purple' | 'teal';
}

const gradients = {
  blue: { bg: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 50%, #90caf9 100%)', accent: '#1976d2' },
  purple: { bg: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 50%, #ce93d8 100%)', accent: '#7b1fa2' },
  teal: { bg: 'linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 50%, #80cbc4 100%)', accent: '#00796b' },
};

const PageHero: React.FC<PageHeroProps> = ({ title, subtitle, variant = 'blue' }) => {
  const { bg, accent } = gradients[variant];
  return (
    <Box
      sx={{
        background: bg,
        borderRadius: 3,
        px: 3,
        py: 2.5,
        mb: 3,
        border: '1px solid',
        borderColor: alpha(accent, 0.2),
        position: 'relative',
        overflow: 'hidden',
        '&::after': {
          content: '""',
          position: 'absolute',
          top: -50,
          right: -50,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: alpha(accent, 0.08),
        },
      }}
    >
      <Typography variant="h4" fontWeight={800} sx={{ color: '#1a1a2e', letterSpacing: '-0.02em', position: 'relative', zIndex: 1 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, position: 'relative', zIndex: 1 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  );
};

export default PageHero;
