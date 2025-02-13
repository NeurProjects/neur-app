'use client';

import { useState } from 'react';

import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart2,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  Repeat2,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatNumber } from '@/lib/utils';
import type { Tweet } from '@/server/actions/twitter';

interface PaginatedTweetCardProps {
  tweets?: Tweet[];
}

export function PaginatedTweetCard({ tweets = [] }: PaginatedTweetCardProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = tweets.length;
  const progress = ((currentPage + 1) / totalPages) * 100;

  const formatDate = (dateString = '') => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (tweets.length === 0) {
    return (
      <div className="text-center text-muted-foreground">
        No tweets to display
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {totalPages > 1 && (
        <div className="space-y-4">
          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
              className="w-28 hover:bg-muted/50"
            >
              <ChevronLeft className="mr-2 size-4" />
              Previous
            </Button>
            <span className="flex items-center text-sm text-muted-foreground">
              {currentPage + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))
              }
              disabled={currentPage >= totalPages - 1}
              className="w-28 hover:bg-muted/50"
            >
              Next
              <ChevronRight className="ml-2 size-4" />
            </Button>
          </div>
          <Progress value={progress} className="h-1" />
        </div>
      )}

      <AnimatePresence mode="wait">
        {tweets.map((tweet, index) => {
          if (index !== currentPage) return null;
          return (
            <motion.div
              key={tweet.id || index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="w-full max-w-md border bg-card">
                <CardContent className="pt-6">
                  <div className="flex items-start space-x-4">
                    <Avatar>
                      <AvatarImage
                        src={tweet.author?.profilePicture}
                        alt={tweet.author?.name}
                      />
                      <AvatarFallback>
                        {tweet.author?.name?.slice(0, 2).toUpperCase() || 'UN'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {tweet.author?.name || 'Unknown Author'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        @{tweet.author?.userName || 'unknown'}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-card-foreground">
                    {tweet.text || 'No content'}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatDate(tweet.createdAt)}
                  </p>
                </CardContent>
                <CardFooter className="flex justify-between text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <MessageCircle className="h-4 w-4" />
                    <span className="text-xs">
                      {formatNumber(tweet.replyCount, true)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Repeat2 className="h-4 w-4" />
                    <span className="text-xs">
                      {formatNumber(tweet.retweetCount, true)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Heart className="h-4 w-4" />
                    <span className="text-xs">
                      {formatNumber(tweet.likeCount, true)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <BarChart2 className="h-4 w-4" />
                    <span className="text-xs">
                      {formatNumber(tweet.viewCount, true)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Bookmark className="h-4 w-4" />
                    <span className="text-xs">
                      {formatNumber(tweet.bookmarkCount, true)}
                    </span>
                  </div>
                </CardFooter>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
