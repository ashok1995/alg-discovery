import React from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';

export default function JsonCard(props: { title: string; data: unknown; maxHeight?: number }) {
  const { title, data, maxHeight } = props;
  return (
    <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={800} mb={1}>
          {title}
        </Typography>
        <Box
          component="pre"
          sx={{
            fontSize: 12,
            overflow: 'auto',
            maxHeight: maxHeight ?? 520,
            p: 1.5,
            bgcolor: 'grey.50',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          {JSON.stringify(data, null, 2)}
        </Box>
      </CardContent>
    </Card>
  );
}

